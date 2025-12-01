import type { Endpoint, PayloadRequest } from 'payload';

/**
 * Endpoint pour sauvegarder une session de quiz adaptatif
 * Requirements: 1.2, 3.4
 */
export const saveAdaptiveQuizSessionEndpoint: Endpoint = {
  path: '/adaptive-quiz/sessions',
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

      // 2. Récupérer les données de la session depuis le body
      const sessionData: any = await req.json?.() || {};

      // 3. Valider les données minimales
      if (!sessionData.questions || !Array.isArray(sessionData.questions)) {
        return Response.json({
          success: false,
          error: 'Invalid session data: questions array is required'
        }, { status: 400 });
      }

      // 4. Générer un sessionId unique
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      // 5. Créer la session dans la collection
      const session = await req.payload.create({
        collection: 'adaptiveQuizSessions',
        data: {
          sessionId,
          user: req.user.id,
          questions: sessionData.questions,
          basedOnAnalytics: sessionData.basedOnAnalytics || {},
          questionDistribution: sessionData.questionDistribution || {},
          config: sessionData.config || {},
          studentLevel: sessionData.studentLevel || 'PASS',
          status: 'active' as const,
          expiresAt: sessionData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });

      // 6. Retourner le succès avec l'ID de la session
      return Response.json({
        success: true,
        sessionId: session.id
      }, { status: 201 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in saveAdaptiveQuizSessionEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to save adaptive quiz session',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer une session de quiz adaptatif
 * Requirements: 1.2, 3.4
 */
export const getAdaptiveQuizSessionEndpoint: Endpoint = {
  path: '/adaptive-quiz/sessions/:sessionId',
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

      // 2. Récupérer le sessionId depuis l'URL
      // Dans Payload v3, les paramètres sont dans req.routeParams
      const sessionId = req.routeParams?.sessionId;

      // 3. Récupérer la session par sessionId (pas par id numérique)
      const sessions = await req.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          sessionId: { equals: sessionId }
        },
        limit: 1,
        depth: 2
      });

      if (sessions.docs.length === 0) {
        return Response.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }

      const session = sessions.docs[0];
      if (!session) {
        return Response.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }

      // 4. Vérifier que l'utilisateur a accès à cette session
      const sessionUserId = typeof session.user === 'string' ? session.user : (session.user as any)?.id;
      
      if (sessionUserId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to this session'
        }, { status: 403 });
      }

      // 5. Retourner la session
      return Response.json({
        success: true,
        data: session
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getAdaptiveQuizSessionEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch adaptive quiz session',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour sauvegarder les résultats d'un quiz adaptatif
 * Requirements: 4.1, 4.2, 4.3
 */
export const saveAdaptiveQuizResultEndpoint: Endpoint = {
  path: '/adaptive-quiz/results',
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

      // 2. Récupérer les données du résultat depuis le body
      const resultData: any = await req.json?.() || {};

      // 3. Valider les données minimales
      if (!resultData.sessionId) {
        return Response.json({
          success: false,
          error: 'Invalid result data: sessionId is required'
        }, { status: 400 });
      }

      // 4. Trouver la session par sessionId pour obtenir son ID numérique
      const sessions = await req.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          sessionId: { equals: resultData.sessionId }
        },
        limit: 1
      });

      if (sessions.docs.length === 0) {
        return Response.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }

      const session = sessions.docs[0];
      if (!session) {
        return Response.json({
          success: false,
          error: 'Session not found'
        }, { status: 404 });
      }

      const sessionDbId = session.id;

      const totalTimeMs =
        typeof resultData.totalTimeMs === 'number' && Number.isFinite(resultData.totalTimeMs)
          ? resultData.totalTimeMs
          : undefined;
      const timeSpentSeconds =
        totalTimeMs !== undefined
          ? Math.max(0, Math.round(totalTimeMs / 1000))
          : resultData.timeSpent || 0;

      // 5. Créer le résultat dans la collection
      const result = await req.payload.create({
        collection: 'adaptiveQuizResults',
        data: {
          session: sessionDbId,
          user: req.user.id,
          overallScore: resultData.overallScore || 0,
          maxScore: resultData.maxScore || 0,
          successRate: resultData.successRate || 0,
          timeSpent: timeSpentSeconds,
          completedAt: new Date().toISOString(),
          categoryResults: resultData.categoryResults || [],
          recommendations: resultData.recommendations || [],
          progressComparison: resultData.progressComparison || {},
          improvementAreas: resultData.improvementAreas || [],
          strengthAreas: resultData.strengthAreas || []
        }
      });

      // 6. Mettre à jour le statut de la session (on a déjà la session de l'étape 4)
      try {
        await req.payload.update({
          collection: 'adaptiveQuizSessions',
          id: sessionDbId,
          data: {
            status: 'completed'
          }
        });
      } catch (updateError) {
        req.payload.logger.warn(`Could not update session status: ${updateError}`);
      }

      // 6. Retourner le succès avec l'ID du résultat
      return Response.json({
        success: true,
        resultId: result.id
      }, { status: 201 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in saveAdaptiveQuizResultEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to save adaptive quiz result',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer les résultats d'une session de quiz adaptatif
 * Requirements: 4.1, 4.4
 */
export const getAdaptiveQuizResultBySessionEndpoint: Endpoint = {
  path: '/adaptive-quiz/results/:sessionId',
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

      // 2. Récupérer le sessionId depuis l'URL
      const sessionId = req.routeParams?.sessionId;

      // 3. Récupérer le résultat
      const results = await req.payload.find({
        collection: 'adaptiveQuizResults',
        where: {
          session: { equals: sessionId }
        },
        limit: 1,
        depth: 2
      });

      if (results.docs.length === 0) {
        return Response.json({
          success: false,
          error: 'No result found for this session'
        }, { status: 404 });
      }

      const result = results.docs[0];
      if (!result) {
        return Response.json({
          success: false,
          error: 'Result not found'
        }, { status: 404 });
      }

      // 4. Vérifier que l'utilisateur a accès à ce résultat
      const resultUserId = typeof result.user === 'number' ? result.user : (typeof result.user === 'object' && result.user !== null ? result.user.id : result.user);
      
      if (resultUserId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return Response.json({
          success: false,
          error: 'Unauthorized access to this result'
        }, { status: 403 });
      }

      // 5. Retourner le résultat
      return Response.json({
        success: true,
        data: result
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getAdaptiveQuizResultBySessionEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch adaptive quiz result',
        details: errorMessage
      }, { status: 500 });
    }
  }
};

/**
 * Endpoint pour récupérer l'historique des sessions adaptatives d'un utilisateur
 * Requirements: 4.4
 */
export const getUserAdaptiveQuizHistoryEndpoint: Endpoint = {
  path: '/adaptive-quiz/history',
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

      // 2. Récupérer les paramètres de pagination
      const { page = '1', limit = '10' } = req.query as Record<string, string>;

      // 3. Récupérer les sessions de l'utilisateur
      const sessions = await req.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          user: { equals: req.user.id }
        },
        page: parseInt(page),
        limit: parseInt(limit),
        sort: '-createdAt',
        depth: 1
      });

      // 4. Pour chaque session, récupérer le résultat associé si disponible
      const sessionsWithResults = await Promise.all(
        sessions.docs.map(async (session) => {
          try {
            const results = await req.payload.find({
              collection: 'adaptiveQuizResults',
              where: {
                session: { equals: session.id }
              },
              limit: 1
            });

            return {
              ...session,
              result: results.docs.length > 0 ? results.docs[0] : null
            };
          } catch (error) {
            return {
              ...session,
              result: null
            };
          }
        })
      );

      // 5. Retourner l'historique
      return Response.json({
        success: true,
        data: {
          sessions: sessionsWithResults,
          totalDocs: sessions.totalDocs,
          totalPages: sessions.totalPages,
          page: sessions.page,
          limit: sessions.limit
        }
      }, { status: 200 });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      req.payload.logger.error(`Error in getUserAdaptiveQuizHistoryEndpoint: ${errorMessage}`);

      return Response.json({
        success: false,
        error: 'Failed to fetch adaptive quiz history',
        details: errorMessage
      }, { status: 500 });
    }
  }
};
