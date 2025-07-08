import type { PayloadRequest } from 'payload';
import type { Response, NextFunction } from 'express';
import type { Question, Quiz, QuizSubmission } from '../../payload-types';

// Type helper pour un Quiz avec ses questions entièrement peuplées
type PopulatedQuiz = Omit<Quiz, 'questions'> & { questions: Question[] };

export const submitHandler = async (req: PayloadRequest, res: Response, next: NextFunction): Promise<Response | void> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Vous devez être connecté pour soumettre un quiz.' });
  }

  try {
    // La seule manière robuste de typer req.params et req.body est une assertion locale
    const { params, body } = req as unknown as {
      params: { id: string };
      body: { answers: { question: number; answer: number }[] };
    };

    const { id: quizId } = params;
    const { answers: studentAnswers } = body;

    if (!quizId || !studentAnswers || !Array.isArray(studentAnswers)) {
      return res.status(400).json({ error: 'Requête invalide. ID du quiz et réponses sont requis.' });
    }

    // Récupérer le quiz et utiliser une assertion de type pour informer TS de la structure attendue
    const numericQuizId = parseInt(quizId, 10);
    if (isNaN(numericQuizId)) {
      return res.status(400).json({ error: 'L\'ID du quiz est invalide.' });
    }

    // Récupérer le quiz et utiliser une assertion de type pour informer TS de la structure attendue
    const quiz = await req.payload.findByID({
      collection: 'quizzes',
      id: numericQuizId,
      depth: 2,
    }) as PopulatedQuiz;

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return res.status(404).json({ error: 'Quiz non trouvé ou ne contenant aucune question.' });
    }

    // Créer une map des bonnes réponses : Map<questionId, correctOptionId>
    const correctAnswersMap = new Map<number, number>();
    quiz.questions.forEach(question => {
      const correctOption = question.options?.find(opt => opt.isCorrect);
      if (question.id && correctOption?.id) {
        correctAnswersMap.set(question.id, correctOption.id);
      }
    });

    let score = 0;
    const processedAnswers = studentAnswers.map(ans => {
      const isCorrect = correctAnswersMap.get(ans.question) === ans.answer;
      if (isCorrect) {
        score++;
      }
      return { question: ans.question, answer: ans.answer, isCorrect };
    });

    const finalScore = (score / quiz.questions.length) * 100;

    const submissionData: Omit<QuizSubmission, 'id' | 'createdAt' | 'updatedAt'> = {
      quiz: quiz.id,
      student: req.user.id,
      submissionDate: new Date().toISOString(),
      answers: processedAnswers,
      finalScore: Math.round(finalScore),
    };

    await req.payload.create({
      collection: 'quiz-submissions',
      data: submissionData,
    });

    return res.status(200).json({ message: 'Quiz soumis avec succès!', score: Math.round(finalScore) });

  } catch (error) {
    console.error('Erreur lors de la soumission du quiz :', error);
    return next(error);
  }
};
