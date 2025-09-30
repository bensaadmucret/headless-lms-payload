// Types pour les endpoints Payload CMS
type Endpoint = {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  handler: (req: any, res: any, next: any) => Promise<void> | void;
};

// Types pour les requêtes Payload
type PayloadRequest = {
  user?: {
    id: string;
    email: string;
    collection: string;
    [key: string]: any;
  };
  payload: any;
  params: Record<string, string>;
  query: Record<string, any>;
  body: any;
  [key: string]: any;
};

// Types pour les réponses Express
type Response = {
  status: (code: number) => Response;
  json: (data: any) => void;
  send: (data: any) => void;
  [key: string]: any;
};

type NextFunction = () => void;

// Types pour les objets métier
interface StudySession {
  id: string;
  title: string;
  quiz?: string | Quiz;
  user?: string | User;
  steps?: Array<StudyStep>;
  status: 'draft' | 'in-progress' | 'completed' | 'cancelled';
  [key: string]: any;
}

interface StudyStep {
  id?: string;
  type: 'instruction' | 'question' | 'quiz' | 'review' | 'flashcards';
  title: string;
  content: string;
  questionType?: 'multiple-choice' | 'open';
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  metadata?: {
    quizId?: string;
    questionId?: string;
    duration?: number;
  };
}

interface Quiz {
  id: string;
  title: string;
  questions?: Array<Question>;
  [key: string]: any;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'open';
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  explanation?: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * Version alternative de l'endpoint pour générer des étapes d'étude
 * Cette version utilise un chemin sans le préfixe /api pour contourner les problèmes de routage
 */
export const generateSessionStepsAltEndpoint: Endpoint = {
  path: '/study-sessions/:id/generate-steps',
  method: 'post',
  handler: async (req: PayloadRequest, res: Response, next: NextFunction) => {
    try {
      console.log(`🔄 [Alt Endpoint] Génération des étapes pour la session d'étude ID: ${req.params.id}`);
      
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        console.log('❌ Utilisateur non authentifié');
        return res.status(401).json({ 
          success: false,
          message: 'Non autorisé' 
        });
      }

      const sessionId = req.params.id;
      
      // Récupérer la session d'étude
      const session = await req.payload.findByID({
        collection: 'study-sessions',
        id: sessionId,
        depth: 2, // Pour récupérer les relations (quiz, user)
      });

      if (!session) {
        console.log(`❌ Session d'étude non trouvée: ${sessionId}`);
        return res.status(404).json({
          success: false,
          message: 'Session d\'étude non trouvée'
        });
      }

      // Vérifier que la session appartient à l'utilisateur connecté
      if (session.user && typeof session.user === 'object' && session.user.id !== req.user.id) {
        console.log(`⛔ Accès non autorisé à la session ${sessionId} pour l'utilisateur ${req.user.id}`);
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à accéder à cette session'
        });
      }

      // Vérifier que la session a un quiz associé
      if (!session.quiz) {
        console.log(`❌ Pas de quiz associé à la session ${sessionId}`);
        return res.status(400).json({
          success: false,
          message: 'La session n\'a pas de quiz associé'
        });
      }

      // Récupérer le quiz complet avec ses questions
      const quizId = typeof session.quiz === 'object' ? session.quiz.id : session.quiz;
      const quiz = await req.payload.findByID({
        collection: 'quizzes',
        id: quizId,
        depth: 2, // Pour récupérer les questions et leurs options
      });

      if (!quiz || !quiz.questions || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        console.log(`❌ Quiz ${quizId} non trouvé ou sans questions`);
        return res.status(400).json({
          success: false,
          message: 'Le quiz associé n\'a pas de questions'
        });
      }

      console.log(`📝 Génération des étapes pour le quiz: ${quiz.title}`);

      // Générer les étapes d'étude basées sur les questions du quiz
      const steps: StudyStep[] = [];
      
      // Étape d'introduction
      steps.push({
        type: 'instruction',
        title: 'Introduction',
        content: `<h2>Bienvenue dans votre session d'étude</h2>
                 <p>Ce quiz contient ${quiz.questions.length} questions sur le thème : ${quiz.title}</p>
                 <p>Prenez votre temps pour répondre à chaque question. Vous pouvez revenir en arrière si nécessaire.</p>`,
      });

      // Étapes pour chaque question
      quiz.questions.forEach((question: Question, index: number) => {
        steps.push({
          type: 'question',
          title: `Question ${index + 1}`,
          content: question.text,
          questionType: question.type,
          options: question.options,
          metadata: {
            quizId: quiz.id,
            questionId: question.id,
            duration: 60, // Durée par défaut en secondes
          },
        });
      });

      // Étape de conclusion
      steps.push({
        type: 'review',
        title: 'Conclusion',
        content: `<h2>Félicitations !</h2>
                 <p>Vous avez terminé toutes les questions de cette session d'étude.</p>
                 <p>Cliquez sur "Terminer" pour voir vos résultats.</p>`,
      });

      console.log(`✅ ${steps.length} étapes générées pour la session ${sessionId}`);

      // Mettre à jour la session avec les étapes générées
      const updatedSession = await req.payload.update({
        collection: 'study-sessions',
        id: sessionId,
        data: {
          steps: steps,
          status: 'in-progress',
        },
      });

      return res.status(200).json(updatedSession);

    } catch (error) {
      console.error('❌ Erreur lors de la génération des étapes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la génération des étapes',
        error: errorMessage
      });
    }
  }
};
