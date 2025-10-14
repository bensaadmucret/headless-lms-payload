import type { Payload } from 'payload'

// Types d'erreurs spécifiques pour le système de quiz adaptatif
export const ADAPTIVE_QUIZ_ERRORS = {
  // Erreurs de données insuffisantes
  INSUFFICIENT_DATA: 'insufficient_data',
  INSUFFICIENT_QUESTIONS: 'insufficient_questions',
  
  // Erreurs de profil utilisateur
  PROFILE_INCOMPLETE: 'profile_incomplete',
  LEVEL_NOT_SET: 'level_not_set',
  
  // Erreurs de limitation de taux
  DAILY_LIMIT_EXCEEDED: 'daily_limit_exceeded',
  COOLDOWN_ACTIVE: 'cooldown_active',
  
  // Erreurs de session
  SESSION_NOT_FOUND: 'session_not_found',
  SESSION_EXPIRED: 'session_expired',
  SESSION_ALREADY_COMPLETED: 'session_already_completed',
  INVALID_SESSION_OWNER: 'invalid_session_owner',
  
  // Erreurs techniques
  TECHNICAL_ERROR: 'technical_error',
  DATABASE_ERROR: 'database_error',
  VALIDATION_ERROR: 'validation_error',
  
  // Erreurs d'authentification
  AUTHENTICATION_REQUIRED: 'authentication_required',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  
  // Erreurs de catégories
  CATEGORY_NOT_FOUND: 'category_not_found',
  INVALID_CATEGORY_CONFIGURATION: 'invalid_category_configuration'
} as const

export type AdaptiveQuizErrorType = typeof ADAPTIVE_QUIZ_ERRORS[keyof typeof ADAPTIVE_QUIZ_ERRORS]

// Interface pour les erreurs structurées
export interface AdaptiveQuizError {
  type: AdaptiveQuizErrorType
  message: string
  details?: Record<string, any>
  timestamp: string
  userId?: string
  sessionId?: string
  context?: string
}

// Messages utilisateur-friendly pour chaque type d'erreur
const ERROR_MESSAGES: Record<AdaptiveQuizErrorType, string> = {
  [ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA]: 'Vous devez compléter au moins 3 quiz avant de pouvoir générer un quiz adaptatif.',
  [ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS]: 'Il n\'y a pas assez de questions disponibles dans vos catégories faibles pour générer un quiz adaptatif.',
  [ADAPTIVE_QUIZ_ERRORS.PROFILE_INCOMPLETE]: 'Votre profil est incomplet. Veuillez compléter vos informations avant de continuer.',
  [ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET]: 'Votre niveau d\'études n\'est pas défini. Veuillez le configurer dans votre profil.',
  [ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED]: 'Vous avez atteint la limite quotidienne de 5 quiz adaptatifs. Revenez demain.',
  [ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE]: 'Vous devez attendre 30 minutes entre chaque génération de quiz adaptatif.',
  [ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND]: 'Session de quiz non trouvée ou expirée.',
  [ADAPTIVE_QUIZ_ERRORS.SESSION_EXPIRED]: 'Cette session de quiz a expiré. Veuillez générer un nouveau quiz.',
  [ADAPTIVE_QUIZ_ERRORS.SESSION_ALREADY_COMPLETED]: 'Cette session de quiz a déjà été complétée.',
  [ADAPTIVE_QUIZ_ERRORS.INVALID_SESSION_OWNER]: 'Vous n\'êtes pas autorisé à accéder à cette session de quiz.',
  [ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR]: 'Une erreur technique s\'est produite. Veuillez réessayer plus tard.',
  [ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR]: 'Erreur de base de données. Veuillez réessayer plus tard.',
  [ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR]: 'Les données fournies ne sont pas valides.',
  [ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED]: 'Vous devez être connecté pour accéder à cette fonctionnalité.',
  [ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS]: 'Vous n\'êtes pas autorisé à effectuer cette action.',
  [ADAPTIVE_QUIZ_ERRORS.CATEGORY_NOT_FOUND]: 'Catégorie non trouvée.',
  [ADAPTIVE_QUIZ_ERRORS.INVALID_CATEGORY_CONFIGURATION]: 'Configuration de catégorie invalide.'
}

// Messages détaillés avec suggestions d'actions
const DETAILED_ERROR_MESSAGES: Record<AdaptiveQuizErrorType, { message: string; suggestion: string; actionUrl?: string }> = {
  [ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA]: {
    message: 'Données insuffisantes pour générer un quiz adaptatif',
    suggestion: 'Complétez au moins 3 quiz réguliers pour que nous puissions analyser vos performances et créer un quiz personnalisé.',
    actionUrl: '/student/quizzes'
  },
  [ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS]: {
    message: 'Questions insuffisantes dans vos catégories faibles',
    suggestion: 'Essayez de compléter plus de quiz dans différentes catégories pour élargir votre base de données.',
    actionUrl: '/student/quizzes'
  },
  [ADAPTIVE_QUIZ_ERRORS.PROFILE_INCOMPLETE]: {
    message: 'Profil utilisateur incomplet',
    suggestion: 'Complétez votre profil avec vos informations d\'études pour une meilleure personnalisation.',
    actionUrl: '/profile'
  },
  [ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET]: {
    message: 'Niveau d\'études non défini',
    suggestion: 'Définissez votre niveau d\'études (PASS ou LAS) dans votre profil.',
    actionUrl: '/profile'
  },
  [ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED]: {
    message: 'Limite quotidienne atteinte',
    suggestion: 'Vous pouvez générer jusqu\'à 5 quiz adaptatifs par jour. Revenez demain pour continuer.',
  },
  [ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE]: {
    message: 'Période d\'attente active',
    suggestion: 'Attendez 30 minutes entre chaque génération de quiz adaptatif pour de meilleurs résultats.',
  },
  [ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND]: {
    message: 'Session introuvable',
    suggestion: 'Cette session n\'existe pas ou a été supprimée. Générez un nouveau quiz.',
    actionUrl: '/student/adaptive-quiz'
  },
  [ADAPTIVE_QUIZ_ERRORS.SESSION_EXPIRED]: {
    message: 'Session expirée',
    suggestion: 'Les sessions de quiz expirent après 24 heures. Générez un nouveau quiz.',
    actionUrl: '/student/adaptive-quiz'
  },
  [ADAPTIVE_QUIZ_ERRORS.SESSION_ALREADY_COMPLETED]: {
    message: 'Session déjà complétée',
    suggestion: 'Cette session a déjà été terminée. Consultez vos résultats ou générez un nouveau quiz.',
    actionUrl: '/student/results'
  },
  [ADAPTIVE_QUIZ_ERRORS.INVALID_SESSION_OWNER]: {
    message: 'Accès non autorisé',
    suggestion: 'Vous ne pouvez accéder qu\'à vos propres sessions de quiz.',
  },
  [ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR]: {
    message: 'Erreur technique',
    suggestion: 'Une erreur inattendue s\'est produite. Veuillez réessayer dans quelques minutes.',
  },
  [ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR]: {
    message: 'Erreur de base de données',
    suggestion: 'Problème temporaire avec la base de données. Veuillez réessayer plus tard.',
  },
  [ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR]: {
    message: 'Données invalides',
    suggestion: 'Vérifiez que toutes les informations fournies sont correctes et complètes.',
  },
  [ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED]: {
    message: 'Authentification requise',
    suggestion: 'Connectez-vous pour accéder aux quiz adaptatifs.',
    actionUrl: '/login'
  },
  [ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS]: {
    message: 'Accès non autorisé',
    suggestion: 'Vous n\'avez pas les permissions nécessaires pour cette action.',
  },
  [ADAPTIVE_QUIZ_ERRORS.CATEGORY_NOT_FOUND]: {
    message: 'Catégorie introuvable',
    suggestion: 'La catégorie demandée n\'existe pas ou a été supprimée.',
  },
  [ADAPTIVE_QUIZ_ERRORS.INVALID_CATEGORY_CONFIGURATION]: {
    message: 'Configuration de catégorie invalide',
    suggestion: 'La configuration de cette catégorie est incorrecte. Contactez l\'administrateur.',
  }
}

export class ErrorHandlingService {
  constructor(private payload: Payload) {}

  /**
   * Obtient le message utilisateur-friendly pour un type d'erreur
   */
  getErrorMessage(errorType: AdaptiveQuizErrorType): string {
    return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR]
  }

  /**
   * Obtient le message détaillé avec suggestions pour un type d'erreur
   */
  getDetailedErrorMessage(errorType: AdaptiveQuizErrorType): { message: string; suggestion: string; actionUrl?: string } {
    return DETAILED_ERROR_MESSAGES[errorType] || DETAILED_ERROR_MESSAGES[ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR]
  }

  /**
   * Crée une erreur structurée pour le système de quiz adaptatif
   */
  createAdaptiveQuizError(
    type: AdaptiveQuizErrorType,
    details?: Record<string, any>,
    userId?: string,
    sessionId?: string,
    context?: string
  ): AdaptiveQuizError {
    return {
      type,
      message: this.getErrorMessage(type),
      details,
      timestamp: new Date().toISOString(),
      userId,
      sessionId,
      context
    }
  }

  /**
   * Mappe les erreurs backend vers un format compatible frontend
   */
  mapBackendErrorToFrontend(error: AdaptiveQuizError | Error | string): {
    success: false
    error: {
      type: string
      message: string
      details?: Record<string, any>
      suggestion?: string
      actionUrl?: string
      timestamp: string
    }
  } {
    let errorType: AdaptiveQuizErrorType
    let details: Record<string, any> | undefined
    let userId: string | undefined
    let sessionId: string | undefined

    // Déterminer le type d'erreur
    if (typeof error === 'string') {
      errorType = error as AdaptiveQuizErrorType
    } else if (error instanceof Error) {
      // Mapper les erreurs JavaScript standard
      errorType = this.mapJavaScriptErrorToAdaptiveError(error)
      details = { originalMessage: error.message, stack: error.stack }
    } else {
      // Erreur structurée AdaptiveQuizError
      errorType = error.type
      details = error.details
      userId = error.userId
      sessionId = error.sessionId
    }

    const detailedMessage = this.getDetailedErrorMessage(errorType)

    return {
      success: false,
      error: {
        type: errorType,
        message: detailedMessage.message,
        details,
        suggestion: detailedMessage.suggestion,
        actionUrl: detailedMessage.actionUrl,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Enregistre une erreur pour audit et debugging
   */
  async logError(
    error: AdaptiveQuizError,
    request?: {
      method?: string
      url?: string
      userAgent?: string
      ip?: string
    }
  ): Promise<void> {
    try {
      // Check if auditLogs collection exists, if not just log to console
      const collections = this.payload.config.collections
      const hasAuditLogs = collections.some((col: any) => col.slug === 'auditLogs')
      
      if (hasAuditLogs) {
        await this.payload.create({
          collection: 'auditLogs' as any,
          data: {
            action: 'adaptive_quiz_error',
            user: error.userId ? { relationTo: 'users', value: error.userId } : undefined,
            details: {
              errorType: error.type,
              errorMessage: error.message,
              errorDetails: error.details,
              sessionId: error.sessionId,
              context: error.context,
              request: request ? {
                method: request.method,
                url: request.url,
                userAgent: request.userAgent,
                ip: request.ip
              } : undefined,
              timestamp: error.timestamp
            },
            severity: this.getErrorSeverity(error.type)
          } as any
        })
      } else {
        // Fallback to console logging
        console.error('Adaptive Quiz Error:', {
          type: error.type,
          message: error.message,
          userId: error.userId,
          sessionId: error.sessionId,
          timestamp: error.timestamp
        })
      }
    } catch (logError) {
      // En cas d'erreur lors du logging, on ne veut pas faire échouer l'opération principale
      console.error('Failed to log adaptive quiz error:', logError)
    }
  }

  /**
   * Mappe les erreurs JavaScript standard vers les types d'erreurs adaptatives
   */
  private mapJavaScriptErrorToAdaptiveError(error: Error): AdaptiveQuizErrorType {
    const message = error.message.toLowerCase()

    if (message.includes('insufficient_data')) {
      return ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA
    }
    if (message.includes('insufficient_questions')) {
      return ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_QUESTIONS
    }
    if (message.includes('level_not_set')) {
      return ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET
    }
    if (message.includes('daily_limit_exceeded')) {
      return ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED
    }
    if (message.includes('cooldown_active')) {
      return ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE
    }
    if (message.includes('session_not_found')) {
      return ADAPTIVE_QUIZ_ERRORS.SESSION_NOT_FOUND
    }
    if (message.includes('session_expired')) {
      return ADAPTIVE_QUIZ_ERRORS.SESSION_EXPIRED
    }
    if (message.includes('validation')) {
      return ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR
    }
    if (message.includes('database') || message.includes('connection')) {
      return ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR
    }
    if (message.includes('unauthorized') || message.includes('permission')) {
      return ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS
    }

    return ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR
  }

  /**
   * Détermine la sévérité d'une erreur pour le logging
   */
  private getErrorSeverity(errorType: AdaptiveQuizErrorType): 'low' | 'medium' | 'high' | 'critical' {
    // Use simple string comparison to avoid TypeScript issues
    switch (errorType) {
      case ADAPTIVE_QUIZ_ERRORS.DATABASE_ERROR:
      case ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR:
        return 'high'
      
      case ADAPTIVE_QUIZ_ERRORS.AUTHENTICATION_REQUIRED:
      case ADAPTIVE_QUIZ_ERRORS.UNAUTHORIZED_ACCESS:
      case ADAPTIVE_QUIZ_ERRORS.VALIDATION_ERROR:
        return 'medium'
      
      case ADAPTIVE_QUIZ_ERRORS.INSUFFICIENT_DATA:
      case ADAPTIVE_QUIZ_ERRORS.DAILY_LIMIT_EXCEEDED:
      case ADAPTIVE_QUIZ_ERRORS.COOLDOWN_ACTIVE:
      case ADAPTIVE_QUIZ_ERRORS.LEVEL_NOT_SET:
      case ADAPTIVE_QUIZ_ERRORS.PROFILE_INCOMPLETE:
        return 'low'
      
      default:
        return 'medium'
    }
  }
}