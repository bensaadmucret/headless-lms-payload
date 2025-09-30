import type { Response, NextFunction } from 'express';
import type { Question, Quiz, QuizSubmission } from '../../payload-types';
import type { ExtendedPayloadRequest } from '../../types/payload-types-extended';

// Type helper pour un Quiz avec ses questions entièrement peuplées
type PopulatedQuiz = Omit<Quiz, 'questions'> & { questions: Question[] };

// Type pour le corps de la requête de soumission, tel qu'envoyé par le front-end
interface SubmitRequestBody {
  answers: {
    question: string; // ID de la question
    answer: string;   // ID de l'option choisie
  }[];
}

// Type pour un objet réponse traité, conforme au schéma de QuizSubmission
type ProcessedAnswer = {
  question: number;
  answer: string;
  isCorrect: boolean;
};

export const submitHandler = async (req: ExtendedPayloadRequest, res: Response, next: NextFunction) => {
  // 1. Vérifier l'authentification de l'utilisateur
  if (!req.user) {
    return res.status(401).json({ message: 'Non autorisé. Vous devez être connecté.' });
  }

  try {
    const { id: quizId } = req.params;
    const { answers: studentAnswers } = req.body as SubmitRequestBody;

    if (!quizId || !studentAnswers || !Array.isArray(studentAnswers)) {
      return res.status(400).json({ message: 'Requête invalide. ID du quiz et réponses sont requis.' });
    }

    // 2. Récupérer le quiz complet avec ses questions et options
    const quiz = await req.payload.findByID({
      collection: 'quizzes',
      id: quizId,
      depth: 2, // Indispensable pour peupler les relations
    }) as PopulatedQuiz;

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      return res.status(404).json({ message: 'Quiz introuvable ou ne contenant aucune question.' });
    }

    // 3. Traiter les réponses, calculer le score et préparer les données
    let score = 0;
    const processedAnswers = studentAnswers.map((userAnswer): ProcessedAnswer | null => {
      const questionIdAsNumber = parseInt(userAnswer.question, 10);
      const studentAnswerId = userAnswer.answer;

      // `quiz.questions` peut contenir des `number` ou des `Question`
      const question = quiz.questions?.find(q => typeof q === 'object' && q.id === questionIdAsNumber) as Question | undefined;

      if (!question || !question.options) {
        return null; // Ignorer si la question n'est pas trouvée ou n'a pas d'options
      }

      const correctOption = question.options.find(opt => opt.isCorrect);
      // Comparaison de chaînes de caractères pour éviter les erreurs de type
      const isCorrect = correctOption ? String(correctOption.id) === String(studentAnswerId) : false;

      if (isCorrect) {
        score++;
      }

      return {
        question: questionIdAsNumber,
        answer: studentAnswerId,
        isCorrect,
      };
    }).filter((answer): answer is ProcessedAnswer => answer !== null); // Type guard pour filtrer les nuls

    // 4. Calculer le score final
    const finalScore = quiz.questions.length > 0 ? (score / quiz.questions.length) * 100 : 0;

    // 5. Créer l'enregistrement de la soumission avec un typage strict
    const submissionData: Omit<QuizSubmission, 'id' | 'createdAt' | 'updatedAt'> = {
      quiz: quiz.id,
      student: req.user.id,
      submissionDate: new Date().toISOString(),
      answers: processedAnswers, // Ce tableau est maintenant correctement typé
      finalScore: Math.round(finalScore),
    };

    const submission = await req.payload.create({
      collection: 'quiz-submissions',
      data: submissionData,
    });

    // 6. Renvoyer une réponse de succès
    return res.status(200).json({
      message: 'Quiz soumis avec succès !',
      submissionId: submission.id,
      score: Math.round(finalScore),
    });

  } catch (error) {
    console.error('Erreur détaillée lors de la soumission du quiz :', error);
    return res.status(500).json({ message: 'Une erreur interne est survenue lors de la soumission.' });
  }
};
