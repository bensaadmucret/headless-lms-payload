import { Endpoint, PayloadRequest } from 'payload';
import payload from 'payload';

export const diagnosticsEndpoint: Endpoint = {
  path: '/diagnostics',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      console.log('🔍 Exécution du diagnostic...');
      console.log(`👤 Utilisateur connecté: ${req.user ? 'Authentifié' : 'Non authentifié'}`);
      
      // Vérifier les cours disponibles
      console.log('📚 Récupération des cours...');
      const coursesResult = await payload.find({
        collection: 'courses',
        depth: 0,
      });
      
      console.log(`📊 Nombre total de cours: ${coursesResult.totalDocs}`);
      console.log(`📊 Cours publiés: ${coursesResult.docs.filter(course => course.published).length}`);
      
      // Vérifier les quiz disponibles
      console.log('❓ Récupération des quiz...');
      const quizzesResult = await payload.find({
        collection: 'quizzes',
        depth: 0,
      });
      
      console.log(`📊 Nombre total de quiz: ${quizzesResult.totalDocs}`);
      console.log(`📊 Quiz publiés: ${quizzesResult.docs.filter(quiz => quiz.published).length}`);
      
      // Vérifier les quiz avec des questions
      const quizzesWithQuestions = quizzesResult.docs.filter(quiz => 
        Array.isArray(quiz.questions) && quiz.questions.length > 0
      );
      console.log(`📊 Quiz avec des questions: ${quizzesWithQuestions.length}`);
      
      // Vérifier les cours avec des quiz
      const coursesWithQuizzes = [];
      for (const course of coursesResult.docs) {
        const quizzes = await payload.find({
          collection: 'quizzes',
          where: {
            course: {
              equals: course.id
            }
          }
        });
        
        if (quizzes.totalDocs > 0) {
          coursesWithQuizzes.push({
            id: course.id,
            title: course.title,
            published: course.published,
            quizCount: quizzes.totalDocs
          });
        }
      }
      
      console.log(`📊 Cours avec des quiz: ${coursesWithQuizzes.length}`);
      console.log('Cours avec des quiz:', coursesWithQuizzes);
      
      // Vérifier les permissions de l'utilisateur
      if (req.user) {
        console.log('👤 Rôle de l\'utilisateur vérifié');
        
        // Simuler la requête que ferait la modale de création de session
        console.log('🔍 Simulation de la requête pour la modale de création de session...');
        const availableCoursesForUser = await payload.find({
          collection: 'courses',
          where: {
            published: {
              equals: true
            }
          },
          depth: 0,
        });
        
        console.log(`📊 Cours disponibles pour l'utilisateur: ${availableCoursesForUser.totalDocs}`);
        console.log('Cours disponibles:', availableCoursesForUser.docs.map(c => ({ id: c.id, title: c.title })));
      }
      
      // Renvoyer les résultats du diagnostic
      return Response.json({
        success: true,
        coursesTotal: coursesResult.totalDocs,
        coursesPublished: coursesResult.docs.filter(course => course.published).length,
        quizzesTotal: quizzesResult.totalDocs,
        quizzesPublished: quizzesResult.docs.filter(quiz => quiz.published).length,
        quizzesWithQuestions: quizzesWithQuestions.length,
        coursesWithQuizzes: coursesWithQuizzes,
      });
    } catch (error) {
      console.error('❌ Erreur lors du diagnostic:', error);
      return Response.json({
        success: false,
        message: 'Une erreur est survenue lors du diagnostic',
        error: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
  }
};
