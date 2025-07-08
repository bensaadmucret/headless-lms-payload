import { CollectionConfig } from 'payload';
import type { Request, Response, NextFunction } from 'express';
import type { Question, Quiz, QuizSubmission, User } from '../payload-types';

// Interface pour la requête de soumission de quiz
interface QuizRequest extends Request {
  user?: {
    id: string;
  };
  payload?: any;
  body: {
    answers: Array<{
      question: string;
      answer: string;
    }>;
  };
  params: {
    id: string;
  };
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
      // @ts-ignore - Ignorer l'erreur de compatibilité avec PayloadHandler
      handler: async (req, res, next) => {
        // Cast explicite pour accéder aux propriétés
        const typedReq = req as QuizRequest;
        
        if (!typedReq.user) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        try {
          const quizId = typedReq.params.id;
          const quiz = await typedReq.payload.findByID({
            collection: 'quizzes',
            id: quizId,
            depth: 2, // To populate questions
          }) as Quiz;

          if (!quiz) {
            return res.status(404).json({ message: 'Quiz not found' });
          }

          // Validate answers
          let score = 0;
          const totalQuestions = quiz.questions?.length || 0;
          const results = [];

          for (const userAnswer of typedReq.body.answers) {
            // Assurer la compatibilité des types lors de la comparaison
            const question = (quiz.questions as Question[]).find(q => String(q.id) === String(userAnswer.question));
            
            if (!question) {
              continue;
            }

            const correctOption = question.options?.find(opt => opt.isCorrect);
            // Assurer la compatibilité des types lors de la comparaison
            const isCorrect = correctOption && userAnswer.answer === String(correctOption.id);
            
            if (isCorrect) {
              score++;
            }

            results.push({
              question: question.id,
              userAnswer: userAnswer.answer,
              correctAnswer: correctOption?.id,
              isCorrect,
            });
          }

          // Create quiz submission
          const submission = await typedReq.payload.create({
            collection: 'quiz-submissions',
            data: {
              quiz: quiz.id,
              user: typedReq.user?.id,
              score,
              totalQuestions,
              results,
            },
          });

          return res.status(200).json({
            message: 'Quiz submitted successfully',
            score,
            totalQuestions,
            results,
            submissionId: submission.id,
          });
        } catch (error) {
          console.error('Error submitting quiz:', error);
          return res.status(500).json({ message: 'Error submitting quiz' });
        }
      },
    },
  ],
};