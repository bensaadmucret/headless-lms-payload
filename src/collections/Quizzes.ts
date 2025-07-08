import type { CollectionConfig, Payload } from 'payload';
import type { Request, Response, NextFunction } from 'express';
import type { Question, Quiz, QuizSubmission, User } from '../payload-types';

// Création d'un type de requête personnalisé qui inclut les propriétés de Payload
interface QuizRequest extends Request {
  user: User;
  payload: Payload;
  params: { id: string };
  body: { answers: { question: number; answer: number }[] };
}

export const Quizzes: CollectionConfig = {
  slug: 'quizzes',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'questions',
      label: 'Questions du Quiz',
      type: 'relationship',
      relationTo: 'questions',
      hasMany: true,
      required: true,
    },
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
  ],
  endpoints: [
    {
      path: '/:id/submit',
      method: 'post',
      handler: async (req: any, res: any, next: any): Promise<void | Response> => {
        // Assertion de type pour garantir la sécurité à l'intérieur de la fonction
        const typedReq = req as QuizRequest;
        // `req.user` et `req.payload` sont maintenant correctement typés grâce à l'interface QuizRequest
        if (!typedReq.user) {
          return res.status(401).json({ error: 'Vous devez être connecté pour soumettre un quiz.' });
        }

        try {
          const numericQuizId = parseInt(typedReq.params.id, 10);
          if (isNaN(numericQuizId)) {
            return res.status(400).json({ error: 'ID de quiz invalide.' });
          }

          const quiz = await typedReq.payload.findByID({
            collection: 'quizzes',
            id: numericQuizId,
            depth: 2,
          }) as Quiz;

          if (!quiz || !quiz.questions || !Array.isArray(quiz.questions)) {
            return res.status(404).json({ error: 'Quiz non trouvé ou mal formé.' });
          }

          let correctAnswersCount = 0;
          const processedAnswers: QuizSubmission['answers'] = [];

          for (const userAnswer of typedReq.body.answers) {
            const question = (quiz.questions as Question[]).find(q => q.id === userAnswer.question);

            // Vérifier si la question et ses options existent
            if (question && question.options && Array.isArray(question.options)) {
              // Trouver l'option correcte dans le tableau d'options de la question
              const correctOption = question.options.find(opt => opt.isCorrect);

              // La réponse est correcte si une option correcte et son ID existent, et que l'ID (converti en nombre) correspond à la réponse de l'utilisateur
              const isCorrect = correctOption && correctOption.id ? parseInt(correctOption.id, 10) === userAnswer.answer : false;

              if (isCorrect) {
                correctAnswersCount++;
              }

              processedAnswers.push({ question: userAnswer.question, answer: userAnswer.answer, isCorrect });
            }
          }

          const finalScore = (correctAnswersCount / quiz.questions.length) * 100;

          const submissionData: Omit<QuizSubmission, 'id' | 'createdAt' | 'updatedAt'> = {
            quiz: quiz.id,
            student: typedReq.user.id,
            submissionDate: new Date().toISOString(),
            answers: processedAnswers,
            finalScore: Math.round(finalScore),
          };

          await typedReq.payload.create({
            collection: 'quiz-submissions',
            data: submissionData,
          });

          return res.status(200).json({ score: finalScore, message: 'Quiz soumis avec succès !' });
        } catch (error) {
          console.error('Erreur lors de la soumission du quiz :', error);
          return next(error);
        }
      },
    },
  ],
};
