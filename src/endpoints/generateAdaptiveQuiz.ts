import type { Endpoint, PayloadRequest } from 'payload';
import { AdaptiveQuizService } from '../services/AdaptiveQuizService';
import { createSecurityMiddleware } from '../middleware/securityMiddleware';
import { AuditLogService } from '../services/AuditLogService';
import { getAdaptiveQuizErrorManager } from '../services/AdaptiveQuizErrorManager';
import { shuffleArray } from '../utils/shuffleArray';

/**
 * Endpoint pour générer un quiz adaptatif personnalisé
 * basé sur les performances passées de l'étudiant.
 * Requirements: 3.1, 3.2, 3.3
 */
export const generateAdaptiveQuizEndpoint: Endpoint = {
  path: '/adaptive-quiz/generate',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const auditService = new AuditLogService(req.payload);
    let sessionId = '';

    try {
      // 1. Vérifier l'authentification de l'utilisateur (avec audit)
      if (!req.user) {
        await auditService.logUnauthorizedAccess(req, 'adaptiveQuizGeneration', 'unknown', 'No user authentication');
        return Response.json({
          success: false,
          error: {
            type: 'authentication_required',
            message: 'Authentification requise pour générer un quiz adaptatif'
          }
        }, { status: 401 });
      }

      req.payload.logger.info(`Génération d'un quiz adaptatif pour l'utilisateur: ${req.user.id}`);

      // 2. Initialiser le service de quiz adaptatif
      const adaptiveQuizService = new AdaptiveQuizService(req.payload);

      // 3. Générer le quiz adaptatif
      const quizResult = await adaptiveQuizService.generateAdaptiveQuiz(String(req.user.id));
      sessionId = quizResult.sessionId;

      // Mélanger les options de chaque question sans modifier les objets d'origine
      const shuffledQuestions = (quizResult.questions || []).map((question) => ({
        ...question,
        options: Array.isArray((question as any).options)
          ? shuffleArray((question as any).options)
          : (question as any).options,
      }));

      // 4. Log successful generation
      // TODO: Uncomment when auditlogs collection is created
      // await auditService.logQuizGeneration(req, sessionId, true);

      // 5. Retourner la réponse structurée compatible avec le frontend
      return Response.json({
        success: true,
        data: {
          id: quizResult.sessionId,
          sessionId: quizResult.sessionId,
          questions: shuffledQuestions,
          type: 'adaptive',
          generatedAt: new Date().toISOString(),
          basedOnAnalytics: {
            weakCategories: [],
            strongCategories: [],
            analysisDate: new Date().toISOString(),
            overallSuccessRate: 0
          },
          questionDistribution: {
            weakCategoryQuestions: 5,
            strongCategoryQuestions: 2,
            totalQuestions: shuffledQuestions.length || 7
          },
          config: {
            weakQuestionsCount: 5,
            strongQuestionsCount: 2,
            minimumQuizzesRequired: 3,
            targetSuccessRate: 0.6
          },
          studentLevel: 'PASS' // TODO: Get from user
        },
        analytics: {
          userId: String(req.user.id),
          overallSuccessRate: 0,
          categoryPerformances: [],
          weakestCategories: [],
          strongestCategories: [],
          totalQuizzesTaken: 0,
          totalQuestionsAnswered: 0,
          analysisDate: new Date().toISOString()
        }
      }, { status: 200 });

    } catch (error: unknown) {
      // Use the centralized error management system
      const errorManager = getAdaptiveQuizErrorManager(req.payload);
      
      const errorResponse = await errorManager.handleQuizGenerationError(
        error instanceof Error ? error : String(error),
        String(req.user?.id || 'unknown'),
        {
          sessionId: sessionId || 'unknown',
          request: {
            method: req.method,
            url: req.url,
            userAgent: req.headers.get('user-agent') || undefined,
            ip: (req as any).ip || 'unknown'
          }
        }
      );

      // Log failed generation with detailed error info
      // TODO: Uncomment when auditlogs collection is created
      // await auditService.logQuizGeneration(
      //   req, 
      //   sessionId || 'unknown', 
      //   false, 
      //   errorResponse.error.type
      // );

      // Handle rate limiting errors specifically
      // TODO: Uncomment when auditlogs collection is created
      // if (errorResponse.error.type === 'daily_limit_exceeded' || 
      //     errorResponse.error.type === 'cooldown_active') {
      //   await auditService.logRateLimitViolation(
      //     req,
      //     errorResponse.error.type === 'daily_limit_exceeded' ? 'daily' : 'cooldown'
      //   );
      // }

      // Determine appropriate HTTP status code
      let statusCode = 500;
      switch (errorResponse.error.type) {
        case 'authentication_required':
          statusCode = 401;
          break;
        case 'unauthorized_access':
          statusCode = 403;
          break;
        case 'insufficient_data':
        case 'level_not_set':
        case 'insufficient_questions':
        case 'profile_incomplete':
        case 'validation_error':
          statusCode = 400;
          break;
        case 'daily_limit_exceeded':
        case 'cooldown_active':
          statusCode = 429;
          break;
        case 'session_not_found':
        case 'category_not_found':
          statusCode = 404;
          break;
        default:
          statusCode = 500;
      }

      return Response.json(errorResponse, { status: statusCode });
    }
  },
};
