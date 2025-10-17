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

// Déclaration de types pour les objets de l'application
interface Course {
  id: string;
  title: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  course: string | Course;
  questions?: any[];
  duration?: number;
  published?: boolean;
}

interface User {
  id: string;
  email: string;
  courses?: Array<string | Course>;
}

export const studentQuizzesEndpoint: Endpoint = {
  path: '/students/me/quizzes',
  method: 'get',
  handler: async (req: PayloadRequest, res: Response, next: NextFunction) => {
    try {
      console.log('🔍 Récupération des quizzes pour l\'étudiant...');
      
      // Vérifier que l'utilisateur est authentifié
      if (!req.user) {
        console.log('❌ Utilisateur non authentifié');
        return res.status(401).json({ 
          success: false,
          message: 'Non autorisé' 
        });
      }

      console.log('👤 Étudiant connecté');

      // Récupérer l'utilisateur avec ses cours
      const user = await req.payload.findByID({
        collection: 'users',
        id: req.user.id,
        depth: 1,
      });

      // Vérifier si l'utilisateur a des cours
      if (!user || !user.courses || !Array.isArray(user.courses) || user.courses.length === 0) {
        console.log('ℹ️ Aucun cours trouvé pour cet étudiant');
        return res.status(200).json({ 
          success: true, 
          data: [] 
        });
      }

      // Récupérer les IDs des cours
      const courseIds = (user as User).courses?.map((course: string | Course) => 
        typeof course === 'string' ? course : course?.id
      ).filter(Boolean) as string[]; // Filtrer les valeurs nulles ou undefined

      console.log(`📚 Cours de l'étudiant:`, courseIds);

      if (courseIds.length === 0) {
        return res.status(200).json({ 
          success: true, 
          data: [] 
        });
      }

      // Récupérer les quizzes pour les cours de l'étudiant
      const quizzes = await req.payload.find({
        collection: 'quizzes',
        where: {
          and: [
            {
              'course': {
                in: courseIds,
              },
            },
            {
              'published': {
                equals: true,
              },
            },
          ],
        },
        depth: 1,
      });

      console.log(`✅ ${quizzes.docs?.length || 0} quizzes trouvés`);

      // Formater la réponse
      const formattedQuizzes = (quizzes.docs || []).map((quiz: Quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        courseId: typeof quiz.course === 'string' ? quiz.course : quiz.course?.id,
        courseName: typeof quiz.course === 'object' ? quiz.course?.title : 'Cours inconnu',
        duration: quiz.duration || 30,
        questionsCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
        isPublished: !!quiz.published,
      }));

      return res.status(200).json({ 
        success: true, 
        data: formattedQuizzes 
      });

    } catch (error) {
      console.error('❌ Erreur lors de la récupération des quizzes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des quizzes',
        error: errorMessage
      });
    }
  }
};
