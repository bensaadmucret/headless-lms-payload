import type { Payload } from 'payload'
import { ErrorHandlingService, ADAPTIVE_QUIZ_ERRORS, type AdaptiveQuizError, type AdaptiveQuizErrorType } from './ErrorHandlingService'
import { ErrorRecoveryService, type RecoveryStrategy } from './ErrorRecoveryService'

// Interface pour la réponse complète de gestion d'erreur
export interface ErrorManagementResponse {
  success: false
  error: {
    type: AdaptiveQuizErrorType
    message: string
    details?: Record<string, any>
    suggestion?: string
    actionUrl?: string
    timestamp: string
  }
  recovery?: RecoveryStrategy
  canRetry: boolean
  retryAfterSeconds?: number
}

/**
 * Service centralisé pour la gestion complète des erreurs du système de quiz adaptatif
 * Combine la gestion des erreurs et les stratégies de récupération
 */
export class AdaptiveQuizErrorManager {
  private errorHandlingService: ErrorHandlingService
  private errorRecoveryService: ErrorRecoveryService

  constructor(private payload: Payload) {
    this.errorHandlingService = new ErrorHandlingService(payload)
    this.errorRecoveryService = new ErrorRecoveryService(payload)
  }

  /**
   * Gère une erreur complètement avec stratégie de récupération
   */
  async handleError(
    error: AdaptiveQuizError | Error | string,
    context?: {
      userId?: string
      sessionId?: string
      operation?: string
      request?: {
        method?: string
        url?: string
        userAgent?: string
        ip?: string
      }
    }
  ): Promise<ErrorManagementResponse> {
    try {
      // Créer ou normaliser l'erreur
      let adaptiveError: AdaptiveQuizError

      if (typeof error === 'string') {
        adaptiveError = this.errorHandlingService.createAdaptiveQuizError(
          error as AdaptiveQuizErrorType,
          undefined,
          context?.userId,
          context?.sessionId,
          context?.operation
        )
      } else if (error instanceof Error) {
        const errorType = this.mapErrorToAdaptiveType(error)
        adaptiveError = this.errorHandlingService.createAdaptiveQuizError(
          errorType,
          { originalMessage: error.message, stack: error.stack },
          context?.userId,
          context?.sessionId,
          context?.operation
        )
      } else {
        adaptiveError = error
      }

      // Logger l'erreur pour audit
      await this.errorHandlingService.logError(adaptiveError, context?.request)

      // Obtenir la stratégie de récupération
      const recovery = await this.getRecoveryStrategy(adaptiveError, context)

      // Mapper vers le format frontend
      const frontendError = this.errorHandlingService.mapBackendErrorToFrontend(adaptiveError)

      return {
        success: false,
        error: {
          type: adaptiveError.type,
          message: frontendError.error.message,
          details: frontendError.error.details,
          suggestion: frontendError.error.suggestion,
          actionUrl: frontendError.error.actionUrl,
          timestamp: frontendError.error.timestamp
        },
        recovery,
        canRetry: recovery?.canRecover || false,
        retryAfterSeconds: recovery?.retryAfterSeconds
      }
    } catch (managementError) {
      // En cas d'erreur dans la gestion d'erreur elle-même
      console.error('Error in error management:', managementError)
      
      return {
        success: false,
        error: {
          type: ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
          message: 'Erreur technique lors de la gestion d\'erreur',
          timestamp: new Date().toISOString()
        },
        canRetry: false
      }
    }
  }

  /**
   * Gère spécifiquement les erreurs de génération de quiz adaptatif
   */
  async handleQuizGenerationError(
    error: Error | string,
    userId: string,
    context?: Record<string, any>
  ): Promise<ErrorManagementResponse> {
    const errorContext = {
      userId,
      operation: 'quiz_generation',
      ...context
    }

    return this.handleError(error, errorContext)
  }

  /**
   * Gère spécifiquement les erreurs de soumission de résultats
   */
  async handleResultSubmissionError(
    error: Error | string,
    userId: string,
    sessionId: string,
    context?: Record<string, any>
  ): Promise<ErrorManagementResponse> {
    const errorContext = {
      userId,
      sessionId,
      operation: 'result_submission',
      ...context
    }

    return this.handleError(error, errorContext)
  }

  /**
   * Gère spécifiquement les erreurs d'éligibilité
   */
  async handleEligibilityError(
    error: Error | string,
    userId: string,
    context?: Record<string, any>
  ): Promise<ErrorManagementResponse> {
    const errorContext = {
      userId,
      operation: 'eligibility_check',
      ...context
    }

    return this.handleError(error, errorContext)
  }

  /**
   * Vérifie si une erreur peut être récupérée automatiquement
   */
  async canAutoRecover(errorType: AdaptiveQuizErrorType, context?: Record<string, any>): Promise<boolean> {
    const autoRecoverableErrors: AdaptiveQuizErrorType[] = [
      ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS,
      ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
      ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR
    ]

    if (!autoRecoverableErrors.includes(errorType)) {
      return false
    }

    // Vérifications spécifiques selon le type d'erreur
    switch (errorType) {
      case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS:
        return context?.userId ? await this.canAdjustQuestionSelection(context.userId) : false
      
      case ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR:
      case ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR:
        return true // Ces erreurs peuvent généralement être retryées
      
      default:
        return false
    }
  }

  /**
   * Tente une récupération automatique pour les erreurs éligibles
   */
  async attemptAutoRecovery(
    errorType: AdaptiveQuizErrorType,
    context: Record<string, any>
  ): Promise<{ success: boolean; result?: any; newError?: AdaptiveQuizError }> {
    try {
      switch (errorType) {
        case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS:
          return await this.autoRecoverInsufficientQuestions(context)
        
        case ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR:
        case ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR:
          return await this.autoRecoverTechnicalError(context)
        
        default:
          return { success: false }
      }
    } catch (recoveryError) {
      const errorMessage = recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
      return {
        success: false,
        newError: this.errorHandlingService.createAdaptiveQuizError(
          ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
          { recoveryError: errorMessage },
          context.userId,
          context.sessionId,
          'auto_recovery'
        )
      }
    }
  }

  /**
   * Obtient les métriques d'erreurs pour monitoring
   */
  async getErrorMetrics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalErrors: number
    errorsByType: Record<AdaptiveQuizErrorType, number>
    recoverySuccessRate: number
    mostCommonErrors: Array<{ type: AdaptiveQuizErrorType; count: number; percentage: number }>
  }> {
    const timeframeDuration = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    }

    const since = new Date(Date.now() - timeframeDuration[timeframe])

    try {
      // Check if auditLogs collection exists
      const collections = this.payload.config.collections
      const hasAuditLogs = collections.some((col: any) => col.slug === 'auditLogs')
      
      if (!hasAuditLogs) {
        return {
          totalErrors: 0,
          errorsByType: {} as Record<AdaptiveQuizErrorType, number>,
          recoverySuccessRate: 0,
          mostCommonErrors: []
        }
      }

      const errorLogs = await this.payload.find({
        collection: 'auditLogs' as any,
        where: {
          and: [
            { action: { equals: 'adaptive_quiz_error' } },
            { createdAt: { greater_than: since } }
          ]
        },
        limit: 1000
      })

      const errorsByType: Record<string, number> = {}
      let recoveryAttempts = 0
      let recoverySuccesses = 0

      errorLogs.docs.forEach((log: any) => {
        const errorType = log.details?.errorType
        if (errorType) {
          errorsByType[errorType] = (errorsByType[errorType] || 0) + 1
        }

        if (log.details?.recovery) {
          recoveryAttempts++
          if (log.details.recovery.success) {
            recoverySuccesses++
          }
        }
      })

      const totalErrors = errorLogs.totalDocs
      const recoverySuccessRate = recoveryAttempts > 0 ? recoverySuccesses / recoveryAttempts : 0

      const mostCommonErrors = Object.entries(errorsByType)
        .map(([type, count]) => ({
          type: type as AdaptiveQuizErrorType,
          count,
          percentage: (count / totalErrors) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      return {
        totalErrors,
        errorsByType: errorsByType as Record<AdaptiveQuizErrorType, number>,
        recoverySuccessRate,
        mostCommonErrors
      }
    } catch (error) {
      console.error('Error getting error metrics:', error)
      return {
        totalErrors: 0,
        errorsByType: {} as Record<AdaptiveQuizErrorType, number>,
        recoverySuccessRate: 0,
        mostCommonErrors: []
      }
    }
  }

  /**
   * Obtient la stratégie de récupération appropriée pour une erreur
   */
  private async getRecoveryStrategy(
    error: AdaptiveQuizError,
    context?: Record<string, any>
  ): Promise<RecoveryStrategy | undefined> {
    if (!context?.userId) {
      return undefined
    }

    try {
      switch (error.type) {
        case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA:
          return await this.errorRecoveryService.handleInsufficientData(context.userId)

        case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS:
          return await this.errorRecoveryService.handleInsufficientQuestions(
            context.userId,
            context.weakCategories || [],
            context.strongCategories || []
          )

        case ADAPTIVE_QUIZ_ERRORS.PROFILE_INCOMPLETE:
        case ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET:
          return await this.errorRecoveryService.handleProfileIncomplete(context.userId)

        case ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED:
          return await this.errorRecoveryService.handleRateLimitExceeded(context.userId, 'daily')

        case ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE:
          return await this.errorRecoveryService.handleRateLimitExceeded(context.userId, 'cooldown')

        case ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR:
        case ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR:
          const originalError = new Error(error.details?.originalMessage || error.message)
          return await this.errorRecoveryService.handleTechnicalError(
            originalError,
            context.operation || 'unknown',
            context.retryCount || 0
          )

        default:
          return undefined
      }
    } catch (recoveryError) {
      console.error('Error getting recovery strategy:', recoveryError)
      return undefined
    }
  }

  /**
   * Mappe les erreurs JavaScript vers les types d'erreurs adaptatives
   */
  private mapErrorToAdaptiveType(error: Error): AdaptiveQuizErrorType {
    const message = error.message.toLowerCase()

    // Mapping spécifique basé sur le message d'erreur
    const errorMappings: Array<{ pattern: RegExp; type: AdaptiveQuizErrorType }> = [
      { pattern: /insufficient.?data/i, type: ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA },
      { pattern: /insufficient.?questions/i, type: ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS },
      { pattern: /level.?not.?set/i, type: ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET },
      { pattern: /daily.?limit/i, type: ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED },
      { pattern: /cooldown/i, type: ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE },
      { pattern: /session.?not.?found/i, type: ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND },
      { pattern: /session.?expired/i, type: ADAPTIVE_QUIZ_ERRORS.SESSION_EXPIRED },
      { pattern: /unauthorized|permission/i, type: ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS },
      { pattern: /validation/i, type: ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR },
      { pattern: /database|connection/i, type: ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR }
    ]

    for (const mapping of errorMappings) {
      if (mapping.pattern.test(error.message)) {
        return mapping.type
      }
    }

    return ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR
  }

  /**
   * Vérifie si on peut ajuster la sélection de questions pour un utilisateur
   */
  private async canAdjustQuestionSelection(userId: string): Promise<boolean> {
    try {
      // Vérifier s'il y a suffisamment de questions au total
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      }) as any

      const totalQuestions = await this.payload.find({
        collection: 'questions',
        where: {
          or: [
            { studentLevel: { equals: user.studentLevel } },
            { studentLevel: { equals: 'both' } }
          ]
        },
        limit: 0
      })

      return totalQuestions.totalDocs >= 5 // Minimum pour un quiz adaptatif réduit
    } catch (error) {
      return false
    }
  }

  /**
   * Tente une récupération automatique pour les questions insuffisantes
   */
  private async autoRecoverInsufficientQuestions(context: Record<string, any>): Promise<{
    success: boolean
    result?: any
    newError?: AdaptiveQuizError
  }> {
    try {
      const recovery = await this.errorRecoveryService.handleInsufficientQuestions(
        context.userId,
        context.weakCategories || [],
        context.strongCategories || []
      )

      if (recovery.canRecover && recovery.fallbackData) {
        return {
          success: true,
          result: recovery.fallbackData
        }
      }

      return { success: false }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        newError: this.errorHandlingService.createAdaptiveQuizError(
          ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
          { autoRecoveryError: errorMessage }
        )
      }
    }
  }

  /**
   * Tente une récupération automatique pour les erreurs techniques
   */
  private async autoRecoverTechnicalError(context: Record<string, any>): Promise<{
    success: boolean
    result?: any
    newError?: AdaptiveQuizError
  }> {
    const maxRetries = 2
    const retryCount = context.retryCount || 0

    if (retryCount >= maxRetries) {
      return { success: false }
    }

    // Attendre un délai avant retry
    const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay))

    return {
      success: true,
      result: { shouldRetry: true, retryCount: retryCount + 1 }
    }
  }
}

// Export du service singleton
let errorManagerInstance: AdaptiveQuizErrorManager | null = null

export function getAdaptiveQuizErrorManager(payload: Payload): AdaptiveQuizErrorManager {
  if (!errorManagerInstance) {
    errorManagerInstance = new AdaptiveQuizErrorManager(payload)
  }
  return errorManagerInstance
}

// Utilitaires pour les endpoints
export function createErrorResponse(
  error: AdaptiveQuizError | Error | string,
  statusCode: number = 400
): { statusCode: number; body: ErrorManagementResponse } {
  // Cette fonction sera utilisée dans les endpoints pour créer des réponses d'erreur cohérentes
  return {
    statusCode,
    body: {
      success: false,
      error: {
        type: typeof error === 'string' ? error as AdaptiveQuizErrorType : ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
        message: typeof error === 'string' ? error : error.message,
        timestamp: new Date().toISOString()
      },
      canRetry: false
    }
  }
}