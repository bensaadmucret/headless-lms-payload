import type { Endpoint, PayloadRequest } from 'payload';
import { PerformanceAnalyticsService } from '../services/PerformanceAnalyticsService';

/**
 * Endpoint pour récupérer les analytics de performance d'un utilisateur spécifique
 * Requirements: 2.1, 2.2, 2.3
 */
export const performanceAnalyticsByUserEndpoint: Endpoint = {
  path: '/performance/analytics/:userId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer l'userId depuis les paramètres
      const userId = (req as any).params?.userId;

      // 3. Vérifier que l'utilisateur accède à ses propres données ou est admin
      if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to user data'
        }, { status: 403 });
      }

      req.payload.logger.info(`Fetching performance analytics for user: ${userId}`);

      // 4. Utiliser le service pour analyser les performances
      const analyticsService = new PerformanceAnalyticsService(req.payload);
      const analytics = await analyticsService.analyzeUserPerformance(userId);

      // 5. Retourner les données
      return Response.json({
        success: true,
        data: {
          userId: analytics.userId,
          totalQuizzesTaken: analytics.totalQuizzesTaken,
          totalQuestionsAnswered: analytics.totalQuestionsAnswered,
          overallSuccessRate: analytics.overallSuccessRate,
          categoryPerformances: analytics.categoryPerformances
        }
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in performanceAnalyticsByUserEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch performance analytics',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer la performance d'une catégorie spécifique pour un utilisateur
 * Requirements: 2.1, 2.2
 */
export const performanceByCategoryEndpoint: Endpoint = {
  path: '/performance/category/:userId/:categoryId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer les paramètres
      const userId = (req as any).params?.userId;
      const categoryId = (req as any).params?.categoryId;

      // 3. Vérifier les permissions
      if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to user data'
        }, { status: 403 });
      }

      req.payload.logger.info(`Fetching category performance for user: ${userId}, category: ${categoryId}`);

      // 4. Utiliser le service pour récupérer la performance de la catégorie
      const analyticsService = new PerformanceAnalyticsService(req.payload);
      const categoryPerformance = await analyticsService.getCategoryPerformance(userId, categoryId);

      // 5. Retourner les données
      return Response.json({
        success: true,
        data: categoryPerformance
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in performanceByCategoryEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch category performance',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour vérifier si un utilisateur a les données minimales requises
 * Requirements: 2.1, 2.3
 */
export const performanceMinimumDataEndpoint: Endpoint = {
  path: '/performance/minimum-data/:userId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer l'userId
      const userId = (req as any).params?.userId;

      // 3. Vérifier les permissions
      if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to user data'
        }, { status: 403 });
      }

      req.payload.logger.info(`Checking minimum data for user: ${userId}`);

      // 4. Utiliser le service pour vérifier les données minimales
      const analyticsService = new PerformanceAnalyticsService(req.payload);
      
      // Récupérer les analytics pour calculer les métriques
      const analytics = await analyticsService.analyzeUserPerformance(userId);
      
      // Calculer le nombre de catégories avec suffisamment de données (au moins 3 questions)
      const categoriesWithSufficientData = analytics.categoryPerformances.filter(
        cat => cat.totalQuestions >= 3
      ).length;

      const meetsMinimumRequirements = analytics.totalQuizzesTaken >= 3 && categoriesWithSufficientData >= 2;

      // 5. Retourner les données
      return Response.json({
        success: true,
        data: {
          totalQuizzesTaken: analytics.totalQuizzesTaken,
          categoriesWithSufficientData,
          meetsMinimumRequirements
        }
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in performanceMinimumDataEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to check minimum data',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour valider les données historiques d'un utilisateur
 * Requirements: 2.3, 5.3
 */
export const performanceValidateHistoryEndpoint: Endpoint = {
  path: '/performance/validate-history/:userId',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer l'userId
      const userId = (req as any).params?.userId;

      // 3. Vérifier les permissions
      if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to user data'
        }, { status: 403 });
      }

      req.payload.logger.info(`Validating historical data for user: ${userId}`);

      // 4. Récupérer toutes les soumissions de quiz complétées
      const submissions = await req.payload.find({
        collection: 'quiz-submissions',
        where: {
          student: { equals: userId },
          completedAt: { exists: true }
        },
        limit: 1000
      });

      // 5. Extraire les catégories valides
      const validCategories = new Set<string>();
      
      for (const submission of submissions.docs) {
        if (submission.answers && Array.isArray(submission.answers)) {
          for (const answer of submission.answers) {
            if (answer.question && typeof answer.question === 'object' && answer.question.category) {
              // Handle both populated (object) and unpopulated (string/number) category references
              const categoryId = typeof answer.question.category === 'object' 
                ? answer.question.category.id 
                : answer.question.category;
              validCategories.add(String(categoryId));
            }
          }
        }
      }

      // 6. Retourner les données de validation
      return Response.json({
        success: true,
        data: {
          completedQuizzes: submissions.totalDocs,
          totalAttempts: submissions.totalDocs,
          validCategories: Array.from(validCategories),
          invalidAttempts: 0
        }
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in performanceValidateHistoryEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to validate historical data',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour mettre à jour les performances d'un utilisateur
 * Requirements: 3.4
 */
export const performanceUpdateEndpoint: Endpoint = {
  path: '/performance/update/:userId',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    try {
      // 1. Vérifier l'authentification
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      // 2. Récupérer l'userId
      const userId = (req as any).params?.userId;

      // 3. Vérifier les permissions
      if (req.user.id !== userId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to user data'
        }, { status: 403 });
      }

      req.payload.logger.info(`Updating performance for user: ${userId}`);

      // 4. Utiliser le service pour recalculer les performances
      const analyticsService = new PerformanceAnalyticsService(req.payload);
      
      try {
        // Analyser les performances de l'utilisateur
        const analytics = await analyticsService.analyzeUserPerformance(userId);

        // 5. Vérifier si un enregistrement existe déjà
        const existingPerformance = await req.payload.find({
          collection: 'user-performances',
          where: {
            user: { equals: userId }
          },
          limit: 1
        });

        // 6. Préparer les données à sauvegarder
        const performanceData = {
          user: userId,
          overallSuccessRate: analytics.overallSuccessRate,
          totalQuizzesTaken: analytics.totalQuizzesTaken,
          totalQuestionsAnswered: analytics.totalQuestionsAnswered,
          categoryPerformances: analytics.categoryPerformances.map(cat => ({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            totalQuestions: cat.totalQuestions,
            correctAnswers: cat.correctAnswers,
            successRate: cat.successRate,
            lastAttemptDate: cat.lastAttemptDate,
            questionsAttempted: cat.questionsAttempted,
            averageTimePerQuestion: cat.averageTimePerQuestion
          })),
          weakestCategories: analytics.weakestCategories.map(cat => ({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            successRate: cat.successRate
          })),
          strongestCategories: analytics.strongestCategories.map(cat => ({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            successRate: cat.successRate
          })),
          lastUpdated: new Date().toISOString(),
          analysisDate: analytics.analysisDate
        };

        // 7. Créer ou mettre à jour l'enregistrement
        let result;
        const existingDoc = existingPerformance.docs[0];
        if (existingPerformance.totalDocs > 0 && existingDoc?.id) {
          // Mise à jour
          result = await req.payload.update({
            collection: 'user-performances',
            id: existingDoc.id,
            data: performanceData
          });
          req.payload.logger.info(`Updated performance record for user: ${userId}`);
        } else {
          // Création
          result = await req.payload.create({
            collection: 'user-performances',
            data: performanceData
          });
          req.payload.logger.info(`Created performance record for user: ${userId}`);
        }

        // 8. Retourner le succès
        return Response.json({
          success: true,
          data: {
            userId: result.user,
            totalQuizzesTaken: result.totalQuizzesTaken,
            overallSuccessRate: result.overallSuccessRate,
            categoriesTracked: result.categoryPerformances.length,
            lastUpdated: result.lastUpdated
          }
        }, { status: 200 });

      } catch (analyticsError: unknown) {
        const errorMessage = analyticsError instanceof Error ? analyticsError.message : 'Unknown error';
        
        // Si l'erreur est "insufficient_data", retourner un message approprié
        if (errorMessage === 'insufficient_data') {
          return Response.json({
            success: false,
            error: 'Insufficient data to calculate performance metrics',
            details: 'User must complete at least one quiz'
          }, { status: 400 });
        }

        throw analyticsError; // Re-throw pour être attrapé par le catch externe
      }

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in performanceUpdateEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to update performance',
        details: errorMessage
      }, { status: 500 });
    }
  }
};
