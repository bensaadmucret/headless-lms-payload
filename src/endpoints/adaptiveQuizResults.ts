import type { Endpoint, PayloadRequest } from 'payload';
import { AdaptiveQuizService } from '../services/AdaptiveQuizService';
import { AuditLogService } from '../services/AuditLogService';
import { SecurityService } from '../services/SecurityService';
import { ValidationService } from '../services/ValidationService';
import type { AdaptiveQuizResult } from '../payload-types';

/**
 * Endpoint pour récupérer les résultats d'un quiz adaptatif
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export const getAdaptiveQuizResultsEndpoint: Endpoint = {
    path: '/adaptive-quiz/results/:sessionId',
    method: 'get',
    handler: async (req: PayloadRequest) => {
        const auditService = new AuditLogService(req.payload);
        const securityService = new SecurityService(req.payload);
        const validationService = new ValidationService(req.payload);

        // 1. Vérifier l'authentification
        const authResult = securityService.validateUserAuthentication(req);
        if (!authResult.isAuthenticated || !authResult.user) {
            await auditService.logUnauthorizedAccess(req, 'adaptiveQuizResults', 'unknown', authResult.error || 'Authentication failed');
            return Response.json({
                success: false,
                error: {
                    type: 'authentication_required',
                    message: authResult.error || 'Authentification requise pour accéder aux résultats'
                }
            }, { status: 401 });
        }

        const user = authResult.user;

        try {
            const sessionId = req.routeParams?.sessionId as string;

            if (!sessionId) {
                return Response.json({
                    success: false,
                    error: {
                        type: 'invalid_session_id',
                        message: 'ID de session manquant ou invalide'
                    }
                }, { status: 400 });
            }

            // Valider le format du sessionId
            if (!validationService.validateSessionIdFormat(sessionId)) {
                await auditService.logSecurityViolation(req, 'invalid_session_id_format', { sessionId });
                return Response.json({
                    success: false,
                    error: {
                        type: 'invalid_session_id',
                        message: 'Format d\'ID de session invalide'
                    }
                }, { status: 400 });
            }

            // Vérifier la propriété de la session
            const ownershipResult = await securityService.validateSessionOwnership(sessionId, user.id);
            if (!ownershipResult.isOwner) {
                await auditService.logUnauthorizedAccess(req, 'adaptiveQuizResults', sessionId, ownershipResult.error || 'Session ownership validation failed');
                return Response.json({
                    success: false,
                    error: {
                        type: 'access_denied',
                        message: ownershipResult.error || 'Accès non autorisé à cette session'
                    }
                }, { status: 403 });
            }

            req.payload.logger.info(`Récupération des résultats pour la session: ${sessionId}`, {
                userId: user.id
            });

            // 2. Rechercher les résultats avec validation de propriété
            const results = await req.payload.find({
                collection: 'adaptiveQuizResults',
                where: {
                    and: [
                        {
                            session: {
                                equals: sessionId
                            }
                        },
                        {
                            user: {
                                equals: user.id
                            }
                        }
                    ]
                },
                depth: 2,
                limit: 1
            });

            // 3. Vérifier si les résultats existent
            if (results.totalDocs === 0) {
                return Response.json({
                    success: false,
                    error: {
                        type: 'results_not_available',
                        message: 'Les résultats ne sont pas encore disponibles pour cette session'
                    }
                }, { status: 404 });
            }

            const result = results.docs[0] as AdaptiveQuizResult;

            // Log successful access
            await auditService.logResultsViewed(req, sessionId, true);

            // 4. Retourner les résultats complets avec recommandations
            return Response.json({
                success: true,
                data: {
                    sessionId: sessionId,
                    overallScore: result.overallScore,
                    maxScore: result.maxScore,
                    successRate: result.successRate,
                    timeSpent: result.timeSpent,
                    completedAt: result.completedAt,
                    categoryResults: result.categoryResults,
                    recommendations: result.recommendations,
                    progressComparison: result.progressComparison,
                    improvementAreas: result.improvementAreas,
                    strengthAreas: result.strengthAreas,
                    nextAdaptiveQuizAvailableAt: result.nextAdaptiveQuizAvailableAt
                }
            }, { status: 200 });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Log failed access
            await auditService.logResultsViewed(req, (req.routeParams?.sessionId as string) || 'unknown', false, errorMessage);

            req.payload.logger.error(`Error in getAdaptiveQuizResultsEndpoint: ${errorMessage}`, {
                userId: req.user?.id,
                sessionId: req.routeParams?.sessionId,
                error: error instanceof Error ? error.stack : error
            });

            return Response.json({
                success: false,
                error: {
                    type: 'technical_error',
                    message: 'Erreur lors de la récupération des résultats'
                }
            }, { status: 500 });
        }
    },
};

/**
 * Endpoint pour sauvegarder les résultats d'un quiz adaptatif
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export const saveAdaptiveQuizResultsEndpoint: Endpoint = {
    path: '/adaptive-quiz/sessions/:sessionId/results',
    method: 'post',
    handler: async (req: PayloadRequest) => {
        const auditService = new AuditLogService(req.payload);
        const securityService = new SecurityService(req.payload);
        const validationService = new ValidationService(req.payload);

        // 1. Vérifier l'authentification
        const authResult = securityService.validateUserAuthentication(req);
        if (!authResult.isAuthenticated || !authResult.user) {
            await auditService.logUnauthorizedAccess(req, 'adaptiveQuizSubmission', 'unknown', authResult.error || 'Authentication failed');
            return Response.json({
                success: false,
                error: {
                    type: 'authentication_required',
                    message: authResult.error || 'Authentification requise pour sauvegarder les résultats'
                }
            }, { status: 401 });
        }

        const user = authResult.user;

        try {
            const sessionId = req.routeParams?.sessionId as string;

            if (!sessionId) {
                return Response.json({
                    success: false,
                    error: {
                        type: 'invalid_session_id',
                        message: 'ID de session manquant ou invalide'
                    }
                }, { status: 400 });
            }

            // Valider le format du sessionId
            if (!validationService.validateSessionIdFormat(sessionId)) {
                await auditService.logSecurityViolation(req, 'invalid_session_id_format', { sessionId });
                return Response.json({
                    success: false,
                    error: {
                        type: 'invalid_session_id',
                        message: 'Format d\'ID de session invalide'
                    }
                }, { status: 400 });
            }

            // 2. Valider les données de réponses
            let body: any;
            try {
                body = req.json ? await req.json() : {};
            } catch (error) {
                return Response.json({
                    success: false,
                    error: {
                        type: 'invalid_request_body',
                        message: 'Corps de requête invalide'
                    }
                }, { status: 400 });
            }

            // Sanitiser et valider les paramètres
            body = validationService.sanitizeParams(body);
            const submissionValidation = validationService.validateSubmissionParams({ sessionId, ...body });

            if (!submissionValidation.isValid) {
                await auditService.logValidationFailure(req, 'submission_params', submissionValidation.errors);
                return Response.json({
                    success: false,
                    error: {
                        type: 'validation_failed',
                        message: 'Paramètres de soumission invalides',
                        details: submissionValidation.errors
                    }
                }, { status: 400 });
            }

            const { answers } = body;

            // Vérifier la propriété de la session
            const ownershipResult = await securityService.validateSessionOwnership(sessionId, user.id);
            if (!ownershipResult.isOwner) {
                await auditService.logUnauthorizedAccess(req, 'adaptiveQuizSubmission', sessionId, ownershipResult.error || 'Session ownership validation failed');
                return Response.json({
                    success: false,
                    error: {
                        type: 'access_denied',
                        message: ownershipResult.error || 'Accès non autorisé à cette session'
                    }
                }, { status: 403 });
            }

            // Vérifier la validité de la session
            const validityResult = await securityService.validateSessionValidity(sessionId);
            if (!validityResult.isValid) {
                return Response.json({
                    success: false,
                    error: {
                        type: 'invalid_session',
                        message: validityResult.error || 'Session invalide',
                        reason: validityResult.reason
                    }
                }, { status: validityResult.reason === 'expired' ? 410 : 400 });
            }

            req.payload.logger.info(`Sauvegarde des résultats pour la session: ${sessionId}`, {
                userId: user.id,
                answersCount: Object.keys(answers).length
            });

            // 3. Vérifier si les résultats n'ont pas déjà été sauvegardés
            const existingResults = await req.payload.find({
                collection: 'adaptiveQuizResults',
                where: {
                    session: { equals: String(validityResult.session.id) }
                },
                limit: 1
            });

            if (existingResults.totalDocs > 0) {
                return Response.json({
                    success: false,
                    error: {
                        type: 'results_already_saved',
                        message: 'Les résultats ont déjà été sauvegardés pour cette session'
                    }
                }, { status: 409 }); // Conflict
            }

            // 4. Sauvegarder les résultats via le service
            const adaptiveQuizService = new AdaptiveQuizService(req.payload);
            const result = await adaptiveQuizService.saveAdaptiveQuizResults(String(sessionId), answers);

            // Log successful submission
            await auditService.logQuizSubmission(req, sessionId, Object.keys(answers).length, true);

            // 5. Retourner les résultats complets
            return Response.json({
                success: true,
                data: {
                    sessionId: sessionId,
                    resultId: result.id,
                    overallScore: result.overallScore,
                    maxScore: result.maxScore,
                    successRate: result.successRate,
                    timeSpent: result.timeSpent,
                    completedAt: result.completedAt,
                    categoryResults: result.categoryResults,
                    recommendations: result.recommendations,
                    progressComparison: result.progressComparison,
                    improvementAreas: result.improvementAreas,
                    strengthAreas: result.strengthAreas,
                    nextAdaptiveQuizAvailableAt: result.nextAdaptiveQuizAvailableAt,
                    message: 'Résultats sauvegardés avec succès'
                }
            }, { status: 201 });

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Log failed submission
            await auditService.logQuizSubmission(req, (req.routeParams?.sessionId as string) || 'unknown', 0, false, errorMessage);

            req.payload.logger.error(`Error in saveAdaptiveQuizResultsEndpoint: ${errorMessage}`, {
                userId: req.user?.id,
                sessionId: req.routeParams?.sessionId,
                error: error instanceof Error ? error.stack : error
            });

            // Handle specific service errors
            let statusCode = 500;
            let errorType = 'technical_error';
            let message = 'Erreur lors de la sauvegarde des résultats';

            switch (errorMessage) {
                case 'session_not_found':
                    statusCode = 404;
                    errorType = 'session_not_found';
                    message = 'Session non trouvée';
                    break;
                case 'session_expired':
                    statusCode = 410;
                    errorType = 'session_expired';
                    message = 'Session expirée';
                    break;
                case 'session_already_completed':
                    statusCode = 409;
                    errorType = 'session_already_completed';
                    message = 'Cette session a déjà été complétée';
                    break;
                case 'answer_enrichment_failed':
                    statusCode = 400;
                    errorType = 'invalid_answers';
                    message = 'Format des réponses invalide';
                    break;
            }

            return Response.json({
                success: false,
                error: {
                    type: errorType,
                    message: message
                }
            }, { status: statusCode });
        }
    },
};