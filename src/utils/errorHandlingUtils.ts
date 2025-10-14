import type { PayloadRequest } from 'payload'
import { getAdaptiveQuizErrorManager, type ErrorManagementResponse } from '../services/AdaptiveQuizErrorManager'
import { ADAPTIVE_QUIZ_ERRORS } from '../services/ErrorHandlingService'

/**
 * Utilitaires pour la gestion d'erreurs dans les endpoints
 */

/**
 * Mappe les types d'erreurs vers les codes de statut HTTP appropriés
 */
export function getHttpStatusForError(errorType: string): number {
    switch (errorType) {
        case ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED:
            return 401
        case ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS:
        case ADAPTIVE_QUIZ_ERRORS.INVALID_SESSION_OWNER:
            return 403
        case ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND:
        case ADAPTIVE_QUIZ_ERRORS.CATEGORY_NOT_FOUND:
            return 404
        case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA:
        case ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET:
        case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS:
        case ADAPTIVE_QUIZ_ERRORS.PROFILE_INCOMPLETE:
        case ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR:
        case ADAPTIVE_QUIZ_ERRORS.SESSION_ALREADY_COMPLETED:
        case ADAPTIVE_QUIZ_ERRORS.SESSION_EXPIRED:
            return 400
        case ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED:
        case ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE:
            return 429
        case ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR:
        case ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR:
        default:
            return 500
    }
}

/**
 * Gère une erreur dans un endpoint et retourne une réponse HTTP appropriée
 */
export async function handleEndpointError(
    req: PayloadRequest,
    error: Error | string,
    context: {
        operation: string
        userId?: string
        sessionId?: string
    }
): Promise<Response> {
    const errorManager = getAdaptiveQuizErrorManager(req.payload)

    const errorResponse = await errorManager.handleError(error, {
        userId: context.userId || String(req.user?.id || ''),
        sessionId: context.sessionId,
        operation: context.operation,
        request: {
            method: req.method,
            url: req.url,
            userAgent: req.headers.get('user-agent') || undefined,
            ip: (req as any).ip || req.headers.get('x-forwarded-for') || 'unknown'
        }
    })

    const statusCode = getHttpStatusForError(errorResponse.error.type)

    return Response.json(errorResponse, { status: statusCode })
}

/**
 * Vérifie l'authentification et retourne une erreur si nécessaire
 */
export function checkAuthentication(req: PayloadRequest): Response | null {
    if (!req.user) {
        const errorResponse: ErrorManagementResponse = {
            success: false,
            error: {
                type: ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED,
                message: 'Authentification requise pour accéder à cette fonctionnalité',
                timestamp: new Date().toISOString()
            },
            canRetry: false
        }

        return Response.json(errorResponse, { status: 401 })
    }

    return null
}

/**
 * Vérifie la propriété d'une session et retourne une erreur si nécessaire
 */
export async function checkSessionOwnership(
    req: PayloadRequest,
    sessionId: string
): Promise<{ session: any; error?: Response }> {
    try {
        const session = await req.payload.findByID({
            collection: 'adaptiveQuizSessions' as any,
            id: sessionId
        })

        const sessionData = session as any
        if (sessionData.user !== req.user?.id && sessionData.user?.id !== req.user?.id) {
            const errorResponse: ErrorManagementResponse = {
                success: false,
                error: {
                    type: ADAPTIVE_QUIZ_ERRORS.INVALID_SESSION_OWNER,
                    message: 'Vous n\'êtes pas autorisé à accéder à cette session',
                    timestamp: new Date().toISOString()
                },
                canRetry: false
            }

            return {
                session: null,
                error: Response.json(errorResponse, { status: 403 })
            }
        }

        return { session: sessionData }
    } catch (error) {
        const errorResponse: ErrorManagementResponse = {
            success: false,
            error: {
                type: ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND,
                message: 'Session non trouvée',
                timestamp: new Date().toISOString()
            },
            canRetry: false
        }

        return {
            session: null,
            error: Response.json(errorResponse, { status: 404 })
        }
    }
}

/**
 * Wrapper pour les endpoints avec gestion d'erreur automatique
 */
export function withErrorHandling(
    operation: string,
    handler: (req: PayloadRequest) => Promise<Response>
) {
    return async (req: PayloadRequest): Promise<Response> => {
        try {
            return await handler(req)
        } catch (error) {
            return await handleEndpointError(req, error instanceof Error ? error : String(error), {
                operation,
                userId: String(req.user?.id || '')
            })
        }
    }
}

/**
 * Crée une réponse de succès standardisée
 */
export function createSuccessResponse(data: any, statusCode: number = 200): Response {
    return Response.json({
        success: true,
        data
    }, { status: statusCode })
}

/**
 * Crée une réponse d'erreur simple sans utiliser le système complet
 */
export function createSimpleErrorResponse(
    message: string,
    errorType: string = ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
    statusCode: number = 500
): Response {
    const errorResponse: ErrorManagementResponse = {
        success: false,
        error: {
            type: errorType as any,
            message,
            timestamp: new Date().toISOString()
        },
        canRetry: false
    }

    return Response.json(errorResponse, { status: statusCode })
}

/**
 * Valide les paramètres requis et retourne une erreur si manquants
 */
export function validateRequiredParams(
    params: Record<string, any>,
    requiredFields: string[]
): Response | null {
    const missingFields = requiredFields.filter(field =>
        params[field] === undefined || params[field] === null || params[field] === ''
    )

    if (missingFields.length > 0) {
        return createSimpleErrorResponse(
            `Paramètres manquants: ${missingFields.join(', ')}`,
            ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR,
            400
        )
    }

    return null
}

/**
 * Extrait les paramètres de l'URL d'une requête
 */
export function extractUrlParams(req: PayloadRequest): Record<string, string> {
    // Extraire les paramètres de l'URL si disponibles
    const url = new URL(req.url || '', 'http://localhost')
    const pathSegments = url.pathname.split('/').filter(Boolean)

    // Pour les endpoints Payload, les paramètres sont souvent dans l'URL
    // Par exemple: /api/adaptive-quiz/sessions/123/results
    const params: Record<string, string> = {}

    // Essayer d'extraire l'ID de la session si présent dans l'URL
    const sessionIdMatch = url.pathname.match(/\/sessions\/([^\/]+)/)
    if (sessionIdMatch && sessionIdMatch[1]) {
        params.sessionId = sessionIdMatch[1]
    }

    // Ajouter d'autres patterns selon les besoins
    const idMatch = url.pathname.match(/\/([a-f0-9]{24})(?:\/|$)/) // MongoDB ObjectId pattern
    if (idMatch && idMatch[1]) {
        params.id = idMatch[1]
    }

    return params
}

/**
 * Exemple d'utilisation dans un endpoint
 */
export const exampleEndpointWithErrorHandling = withErrorHandling('example_operation', async (req) => {
    // Vérifier l'authentification
    const authError = checkAuthentication(req)
    if (authError) return authError

    // Extraire les paramètres de l'URL
    const params = extractUrlParams(req)
    const { sessionId } = params

    // Valider les paramètres
    const validationError = validateRequiredParams({ sessionId }, ['sessionId'])
    if (validationError) return validationError

    // Vérifier la propriété de la session
    if (!sessionId) {
        return createSimpleErrorResponse('Session ID manquant', ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR, 400)
    }

    const { session, error: sessionError } = await checkSessionOwnership(req, sessionId)
    if (sessionError) return sessionError

    // Logique métier ici...
    const result = { message: 'Opération réussie', session }

    return createSuccessResponse(result)
})