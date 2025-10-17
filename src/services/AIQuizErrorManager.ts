/**
 * Service de gestion des erreurs spécifique au générateur de quiz IA
 * Implémente la tâche 8: Gestion des erreurs et robustesse
 */

import type { Payload } from 'payload'
import { ErrorHandlingService, ADAPTIVE_QUIZ_ERRORS, type AdaptiveQuizError, type AdaptiveQuizErrorType } from './ErrorHandlingService'
import { ErrorRecoveryService, type RecoveryStrategy } from './ErrorRecoveryService'

// Types d'erreurs spécifiques au générateur de quiz IA
export const AI_QUIZ_ERRORS = {
  // Erreurs API IA
  AI_API_UNAVAILABLE: 'ai_api_unavailable',
  AI_RATE_LIMIT_EXCEEDED: 'ai_rate_limit_exceeded',
  AI_INVALID_RESPONSE: 'ai_invalid_response',
  AI_TIMEOUT: 'ai_timeout',
  AI_QUOTA_EXCEEDED: 'ai_quota_exceeded',
  AI_MODEL_OVERLOADED: 'ai_model_overloaded',
  
  // Erreurs de validation
  VALIDATION_FAILED: 'validation_failed',
  INVALID_JSON_RESPONSE: 'invalid_json_response',
  INSUFFICIENT_QUALITY: 'insufficient_quality',
  CONTENT_POLICY_VIOLATION: 'content_policy_violation',
  
  // Erreurs de configuration
  INVALID_GENERATION_CONFIG: 'invalid_generation_config',
  MISSING_REQUIRED_PARAMETERS: 'missing_required_parameters',
  UNSUPPORTED_STUDENT_LEVEL: 'unsupported_student_level',
  INVALID_QUESTION_COUNT: 'invalid_question_count',
  
  // Erreurs de création
  DATABASE_CREATION_FAILED: 'database_creation_failed',
  CATEGORY_NOT_FOUND: 'category_not_found',
  QUIZ_CREATION_FAILED: 'quiz_creation_failed',
  QUESTION_CREATION_FAILED: 'question_creation_failed'
} as const

export type AIQuizErrorType = typeof AI_QUIZ_ERRORS[keyof typeof AI_QUIZ_ERRORS]

// Interface pour les erreurs de génération IA
export interface AIQuizError {
  type: AIQuizErrorType
  message: string
  details?: Record<string, any>
  timestamp: string
  userId?: string
  retryable: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestedAction?: string
  retryAfterSeconds?: number
}

// Interface pour la réponse de gestion d'erreur
export interface AIQuizErrorResponse {
  success: false
  error: {
    type: AIQuizErrorType
    message: string
    userMessage: string
    details?: Record<string, any>
    suggestion?: string
    actionUrl?: string
    timestamp: string
  }
  recovery?: RecoveryStrategy
  canRetry: boolean
  retryAfterSeconds?: number
  fallbackOptions?: Array<{
    title: string
    description: string
    actionUrl: string
  }>
}

/**
 * Gestionnaire d'erreurs spécialisé pour le générateur de quiz IA
 */
export class AIQuizErrorManager {
  private errorHandlingService: ErrorHandlingService
  private errorRecoveryService: ErrorRecoveryService
  private retryAttempts: Map<string, number> = new Map()
  private errorMetrics: Map<AIQuizErrorType, number> = new Map()

  // Configuration des retry
  private readonly MAX_RETRIES = 3
  private readonly BASE_RETRY_DELAY = 2000 // 2 secondes
  private readonly MAX_RETRY_DELAY = 30000 // 30 secondes

  constructor(private payload: Payload) {
    this.errorHandlingService = new ErrorHandlingService(payload)
    this.errorRecoveryService = new ErrorRecoveryService(payload)
  }

  /**
   * Gère une erreur de génération de quiz IA avec stratégies de récupération
   */
  async handleAIQuizError(
    error: Error | string | AIQuizError,
    context: {
      userId?: string
      operation: 'generation' | 'validation' | 'creation' | 'config'
      config?: Record<string, any>
      attempt?: number
    }
  ): Promise<AIQuizErrorResponse> {
    const startTime = Date.now()
    
    try {
      // Normaliser l'erreur
      const aiError = this.normalizeError(error, context)
      
      // Enregistrer les métriques
      this.recordErrorMetric(aiError.type)
      
      // Logger l'erreur
      await this.logAIQuizError(aiError, context)
      
      // Déterminer la stratégie de récupération
      const recovery = await this.determineRecoveryStrategy(aiError, context)
      
      // Générer la réponse utilisateur
      const userMessage = this.generateUserFriendlyMessage(aiError)
      const fallbackOptions = this.generateFallbackOptions(aiError, context)
      
      const response: AIQuizErrorResponse = {
        success: false,
        error: {
          type: aiError.type,
          message: aiError.message,
          userMessage,
          details: aiError.details,
          suggestion: aiError.suggestedAction,
          timestamp: aiError.timestamp
        },
        recovery,
        canRetry: aiError.retryable && (context.attempt || 0) < this.MAX_RETRIES,
        retryAfterSeconds: aiError.retryAfterSeconds,
        fallbackOptions
      }

      console.log(`🔧 Erreur IA gérée en ${Date.now() - startTime}ms:`, {
        type: aiError.type,
        severity: aiError.severity,
        retryable: aiError.retryable,
        hasRecovery: !!recovery
      })

      return response

    } catch (managementError) {
      console.error('❌ Erreur dans la gestion d\'erreur IA:', managementError)
      
      return {
        success: false,
        error: {
          type: AI_QUIZ_ERRORS.AI_API_UNAVAILABLE,
          message: 'Erreur système lors de la gestion d\'erreur',
          userMessage: 'Une erreur technique s\'est produite. Veuillez réessayer plus tard.',
          timestamp: new Date().toISOString()
        },
        canRetry: false
      }
    }
  }

  /**
   * Gère spécifiquement les erreurs d'API IA avec retry intelligent
   */
  async handleAPIError(
    error: Error,
    context: {
      userId?: string
      prompt?: string
      model?: string
      attempt?: number
    }
  ): Promise<AIQuizErrorResponse> {
    const apiError = this.analyzeAPIError(error)
    
    return this.handleAIQuizError(apiError, {
      ...context,
      operation: 'generation'
    })
  }

  /**
   * Gère les erreurs de validation avec suggestions d'amélioration
   */
  async handleValidationError(
    validationResult: {
      isValid: boolean
      score: number
      issues: Array<{ message: string; severity: string }>
    },
    context: {
      userId?: string
      generatedContent?: any
      attempt?: number
    }
  ): Promise<AIQuizErrorResponse> {
    const validationError: AIQuizError = {
      type: AI_QUIZ_ERRORS.VALIDATION_FAILED,
      message: `Validation échouée avec un score de ${validationResult.score}/100`,
      details: {
        score: validationResult.score,
        issues: validationResult.issues,
        criticalIssues: validationResult.issues.filter(i => i.severity === 'critical').length,
        majorIssues: validationResult.issues.filter(i => i.severity === 'major').length
      },
      timestamp: new Date().toISOString(),
      userId: context.userId,
      retryable: validationResult.score >= 30, // Retry si score pas trop bas
      severity: validationResult.score < 30 ? 'high' : 'medium',
      suggestedAction: validationResult.score < 50 
        ? 'Ajuster les paramètres de génération'
        : 'Régénérer avec des instructions plus précises'
    }

    return this.handleAIQuizError(validationError, {
      ...context,
      operation: 'validation'
    })
  }

  /**
   * Gère les erreurs de configuration avec validation des paramètres
   */
  async handleConfigurationError(
    config: Record<string, any>,
    validationErrors: string[],
    context: { userId?: string }
  ): Promise<AIQuizErrorResponse> {
    const configError: AIQuizError = {
      type: AI_QUIZ_ERRORS.INVALID_GENERATION_CONFIG,
      message: 'Configuration de génération invalide',
      details: {
        config,
        validationErrors,
        missingFields: this.identifyMissingFields(config),
        invalidFields: this.identifyInvalidFields(config)
      },
      timestamp: new Date().toISOString(),
      userId: context.userId,
      retryable: false, // Nécessite correction manuelle
      severity: 'medium',
      suggestedAction: 'Corriger les paramètres de configuration'
    }

    return this.handleAIQuizError(configError, {
      ...context,
      operation: 'config'
    })
  }

  /**
   * Tente une récupération automatique avec retry intelligent
   */
  async attemptAutoRecovery(
    errorType: AIQuizErrorType,
    context: Record<string, any>
  ): Promise<{
    success: boolean
    result?: any
    newError?: AIQuizError
    shouldRetry: boolean
    retryDelay?: number
  }> {
    const attempt = context.attempt || 0
    const retryKey = `${errorType}_${context.userId || 'anonymous'}`
    
    try {
      switch (errorType) {
        case AI_QUIZ_ERRORS.AI_RATE_LIMIT_EXCEEDED:
          return await this.recoverFromRateLimit(context, attempt)
          
        case AI_QUIZ_ERRORS.AI_TIMEOUT:
        case AI_QUIZ_ERRORS.AI_MODEL_OVERLOADED:
          return await this.recoverFromTemporaryFailure(context, attempt)
          
        case AI_QUIZ_ERRORS.VALIDATION_FAILED:
          return await this.recoverFromValidationFailure(context, attempt)
          
        case AI_QUIZ_ERRORS.INVALID_JSON_RESPONSE:
          return await this.recoverFromInvalidJSON(context, attempt)
          
        default:
          return { success: false, shouldRetry: false }
      }
    } catch (recoveryError) {
      console.error('❌ Erreur lors de la récupération automatique:', recoveryError)
      
      return {
        success: false,
        shouldRetry: attempt < this.MAX_RETRIES,
        retryDelay: this.calculateRetryDelay(attempt),
        newError: {
          type: AI_QUIZ_ERRORS.AI_API_UNAVAILABLE,
          message: 'Échec de la récupération automatique',
          details: { originalError: errorType, recoveryError: recoveryError.message },
          timestamp: new Date().toISOString(),
          retryable: true,
          severity: 'medium'
        }
      }
    }
  }

  /**
   * Valide les paramètres de génération côté serveur
   */
  validateGenerationConfig(config: {
    subject?: string
    categoryId?: string
    studentLevel?: string
    questionCount?: number
    difficulty?: string
    includeExplanations?: boolean
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validation du sujet
    if (!config.subject || config.subject.trim().length < 10) {
      errors.push('Le sujet doit contenir au moins 10 caractères')
    }
    if (config.subject && config.subject.length > 200) {
      errors.push('Le sujet ne peut pas dépasser 200 caractères')
    }

    // Validation de la catégorie
    if (!config.categoryId) {
      errors.push('Une catégorie doit être sélectionnée')
    }

    // Validation du niveau étudiant
    if (!config.studentLevel || !['PASS', 'LAS', 'both'].includes(config.studentLevel)) {
      errors.push('Le niveau étudiant doit être PASS, LAS ou both')
    }

    // Validation du nombre de questions
    if (!config.questionCount || config.questionCount < 5 || config.questionCount > 20) {
      errors.push('Le nombre de questions doit être entre 5 et 20')
    }

    // Validation de la difficulté
    if (config.difficulty && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
      errors.push('La difficulté doit être easy, medium ou hard')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Génère des messages d'erreur informatifs pour les utilisateurs
   */
  private generateUserFriendlyMessage(error: AIQuizError): string {
    const messages: Record<AIQuizErrorType, string> = {
      [AI_QUIZ_ERRORS.AI_API_UNAVAILABLE]: 'Le service de génération IA est temporairement indisponible. Veuillez réessayer dans quelques minutes.',
      [AI_QUIZ_ERRORS.AI_RATE_LIMIT_EXCEEDED]: 'Trop de demandes ont été effectuées. Veuillez attendre avant de générer un nouveau quiz.',
      [AI_QUIZ_ERRORS.AI_INVALID_RESPONSE]: 'La génération IA a produit une réponse invalide. Une nouvelle tentative va être effectuée automatiquement.',
      [AI_QUIZ_ERRORS.AI_TIMEOUT]: 'La génération a pris trop de temps. Essayez de réduire le nombre de questions ou simplifier le sujet.',
      [AI_QUIZ_ERRORS.AI_QUOTA_EXCEEDED]: 'Le quota d\'utilisation de l\'IA a été atteint. Veuillez réessayer plus tard.',
      [AI_QUIZ_ERRORS.AI_MODEL_OVERLOADED]: 'Le modèle IA est surchargé. Veuillez patienter quelques minutes avant de réessayer.',
      [AI_QUIZ_ERRORS.VALIDATION_FAILED]: 'Le contenu généré ne respecte pas les critères de qualité. Une nouvelle génération va être tentée.',
      [AI_QUIZ_ERRORS.INVALID_JSON_RESPONSE]: 'Format de réponse invalide de l\'IA. Le système va automatiquement réessayer.',
      [AI_QUIZ_ERRORS.INSUFFICIENT_QUALITY]: 'La qualité du contenu généré est insuffisante. Essayez d\'ajuster vos paramètres.',
      [AI_QUIZ_ERRORS.CONTENT_POLICY_VIOLATION]: 'Le contenu généré ne respecte pas les politiques de contenu. Veuillez modifier votre sujet.',
      [AI_QUIZ_ERRORS.INVALID_GENERATION_CONFIG]: 'Les paramètres de génération sont invalides. Veuillez vérifier votre configuration.',
      [AI_QUIZ_ERRORS.MISSING_REQUIRED_PARAMETERS]: 'Des paramètres obligatoires sont manquants. Veuillez compléter le formulaire.',
      [AI_QUIZ_ERRORS.UNSUPPORTED_STUDENT_LEVEL]: 'Le niveau étudiant spécifié n\'est pas supporté.',
      [AI_QUIZ_ERRORS.INVALID_QUESTION_COUNT]: 'Le nombre de questions doit être entre 5 et 20.',
      [AI_QUIZ_ERRORS.DATABASE_CREATION_FAILED]: 'Erreur lors de la sauvegarde en base de données. Veuillez réessayer.',
      [AI_QUIZ_ERRORS.CATEGORY_NOT_FOUND]: 'La catégorie sélectionnée n\'existe pas ou a été supprimée.',
      [AI_QUIZ_ERRORS.QUIZ_CREATION_FAILED]: 'Erreur lors de la création du quiz. Veuillez réessayer.',
      [AI_QUIZ_ERRORS.QUESTION_CREATION_FAILED]: 'Erreur lors de la création des questions. Veuillez réessayer.'
    }

    return messages[error.type] || 'Une erreur inattendue s\'est produite lors de la génération du quiz.'
  }

  /**
   * Génère des options de fallback pour l'utilisateur
   */
  private generateFallbackOptions(
    error: AIQuizError,
    context: { operation: string; config?: Record<string, any> }
  ): Array<{ title: string; description: string; actionUrl: string }> {
    const options: Array<{ title: string; description: string; actionUrl: string }> = []

    // Options communes
    options.push({
      title: 'Créer un quiz manuellement',
      description: 'Créez votre quiz question par question avec l\'éditeur manuel',
      actionUrl: '/admin/collections/quizzes/create'
    })

    // Options spécifiques selon le type d'erreur
    switch (error.type) {
      case AI_QUIZ_ERRORS.AI_API_UNAVAILABLE:
      case AI_QUIZ_ERRORS.AI_TIMEOUT:
        options.push({
          title: 'Utiliser un modèle de quiz',
          description: 'Partez d\'un modèle existant et adaptez-le à vos besoins',
          actionUrl: '/admin/quiz-templates'
        })
        break

      case AI_QUIZ_ERRORS.VALIDATION_FAILED:
      case AI_QUIZ_ERRORS.INSUFFICIENT_QUALITY:
        options.push({
          title: 'Ajuster les paramètres',
          description: 'Modifiez le sujet, la difficulté ou le nombre de questions',
          actionUrl: '/admin/ai-quiz-generator?retry=true'
        })
        break

      case AI_QUIZ_ERRORS.CATEGORY_NOT_FOUND:
        options.push({
          title: 'Gérer les catégories',
          description: 'Créez ou modifiez les catégories disponibles',
          actionUrl: '/admin/collections/categories'
        })
        break
    }

    return options
  }

  /**
   * Normalise différents types d'erreurs vers le format AIQuizError
   */
  private normalizeError(
    error: Error | string | AIQuizError,
    context: { operation: string; attempt?: number }
  ): AIQuizError {
    if (typeof error === 'object' && 'type' in error) {
      return error as AIQuizError
    }

    const message = typeof error === 'string' ? error : error.message
    const errorType = this.classifyError(message, context.operation)

    return {
      type: errorType,
      message,
      timestamp: new Date().toISOString(),
      retryable: this.isRetryableError(errorType),
      severity: this.getErrorSeverity(errorType),
      details: typeof error === 'object' ? { stack: error.stack } : undefined
    }
  }

  /**
   * Classifie une erreur selon son message et contexte
   */
  private classifyError(message: string, operation: string): AIQuizErrorType {
    const lowerMessage = message.toLowerCase()

    // Erreurs API IA
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('quota')) {
      return AI_QUIZ_ERRORS.AI_RATE_LIMIT_EXCEEDED
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return AI_QUIZ_ERRORS.AI_TIMEOUT
    }
    if (lowerMessage.includes('unavailable') || lowerMessage.includes('service')) {
      return AI_QUIZ_ERRORS.AI_API_UNAVAILABLE
    }
    if (lowerMessage.includes('overloaded') || lowerMessage.includes('busy')) {
      return AI_QUIZ_ERRORS.AI_MODEL_OVERLOADED
    }

    // Erreurs de validation
    if (operation === 'validation') {
      if (lowerMessage.includes('json')) {
        return AI_QUIZ_ERRORS.INVALID_JSON_RESPONSE
      }
      return AI_QUIZ_ERRORS.VALIDATION_FAILED
    }

    // Erreurs de configuration
    if (operation === 'config') {
      if (lowerMessage.includes('missing') || lowerMessage.includes('required')) {
        return AI_QUIZ_ERRORS.MISSING_REQUIRED_PARAMETERS
      }
      return AI_QUIZ_ERRORS.INVALID_GENERATION_CONFIG
    }

    // Erreurs de création
    if (operation === 'creation') {
      if (lowerMessage.includes('category')) {
        return AI_QUIZ_ERRORS.CATEGORY_NOT_FOUND
      }
      if (lowerMessage.includes('quiz')) {
        return AI_QUIZ_ERRORS.QUIZ_CREATION_FAILED
      }
      if (lowerMessage.includes('question')) {
        return AI_QUIZ_ERRORS.QUESTION_CREATION_FAILED
      }
      return AI_QUIZ_ERRORS.DATABASE_CREATION_FAILED
    }

    return AI_QUIZ_ERRORS.AI_API_UNAVAILABLE
  }

  /**
   * Détermine si une erreur est retryable
   */
  private isRetryableError(errorType: AIQuizErrorType): boolean {
    const retryableErrors: AIQuizErrorType[] = [
      AI_QUIZ_ERRORS.AI_TIMEOUT,
      AI_QUIZ_ERRORS.AI_MODEL_OVERLOADED,
      AI_QUIZ_ERRORS.AI_INVALID_RESPONSE,
      AI_QUIZ_ERRORS.INVALID_JSON_RESPONSE,
      AI_QUIZ_ERRORS.DATABASE_CREATION_FAILED,
      AI_QUIZ_ERRORS.QUIZ_CREATION_FAILED,
      AI_QUIZ_ERRORS.QUESTION_CREATION_FAILED
    ]

    return retryableErrors.includes(errorType)
  }

  /**
   * Détermine la sévérité d'une erreur
   */
  private getErrorSeverity(errorType: AIQuizErrorType): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<AIQuizErrorType, 'low' | 'medium' | 'high' | 'critical'> = {
      [AI_QUIZ_ERRORS.AI_API_UNAVAILABLE]: 'high',
      [AI_QUIZ_ERRORS.AI_RATE_LIMIT_EXCEEDED]: 'medium',
      [AI_QUIZ_ERRORS.AI_INVALID_RESPONSE]: 'medium',
      [AI_QUIZ_ERRORS.AI_TIMEOUT]: 'medium',
      [AI_QUIZ_ERRORS.AI_QUOTA_EXCEEDED]: 'high',
      [AI_QUIZ_ERRORS.AI_MODEL_OVERLOADED]: 'medium',
      [AI_QUIZ_ERRORS.VALIDATION_FAILED]: 'low',
      [AI_QUIZ_ERRORS.INVALID_JSON_RESPONSE]: 'medium',
      [AI_QUIZ_ERRORS.INSUFFICIENT_QUALITY]: 'low',
      [AI_QUIZ_ERRORS.CONTENT_POLICY_VIOLATION]: 'high',
      [AI_QUIZ_ERRORS.INVALID_GENERATION_CONFIG]: 'low',
      [AI_QUIZ_ERRORS.MISSING_REQUIRED_PARAMETERS]: 'low',
      [AI_QUIZ_ERRORS.UNSUPPORTED_STUDENT_LEVEL]: 'low',
      [AI_QUIZ_ERRORS.INVALID_QUESTION_COUNT]: 'low',
      [AI_QUIZ_ERRORS.DATABASE_CREATION_FAILED]: 'high',
      [AI_QUIZ_ERRORS.CATEGORY_NOT_FOUND]: 'medium',
      [AI_QUIZ_ERRORS.QUIZ_CREATION_FAILED]: 'high',
      [AI_QUIZ_ERRORS.QUESTION_CREATION_FAILED]: 'high'
    }

    return severityMap[errorType] || 'medium'
  }

  /**
   * Analyse une erreur d'API pour déterminer son type
   */
  private analyzeAPIError(error: Error): AIQuizError {
    const message = error.message.toLowerCase()
    let type: AIQuizErrorType
    let retryAfterSeconds: number | undefined

    if (message.includes('rate limit') || message.includes('429')) {
      type = AI_QUIZ_ERRORS.AI_RATE_LIMIT_EXCEEDED
      retryAfterSeconds = 60 // 1 minute par défaut
    } else if (message.includes('timeout') || message.includes('504')) {
      type = AI_QUIZ_ERRORS.AI_TIMEOUT
    } else if (message.includes('quota') || message.includes('billing')) {
      type = AI_QUIZ_ERRORS.AI_QUOTA_EXCEEDED
    } else if (message.includes('overloaded') || message.includes('503')) {
      type = AI_QUIZ_ERRORS.AI_MODEL_OVERLOADED
      retryAfterSeconds = 30
    } else if (message.includes('502') || message.includes('500')) {
      type = AI_QUIZ_ERRORS.AI_API_UNAVAILABLE
    } else {
      type = AI_QUIZ_ERRORS.AI_INVALID_RESPONSE
    }

    return {
      type,
      message: error.message,
      details: { stack: error.stack },
      timestamp: new Date().toISOString(),
      retryable: this.isRetryableError(type),
      severity: this.getErrorSeverity(type),
      retryAfterSeconds
    }
  }

  /**
   * Identifie les champs manquants dans la configuration
   */
  private identifyMissingFields(config: Record<string, any>): string[] {
    const requiredFields = ['subject', 'categoryId', 'studentLevel', 'questionCount']
    return requiredFields.filter(field => !config[field])
  }

  /**
   * Identifie les champs invalides dans la configuration
   */
  private identifyInvalidFields(config: Record<string, any>): string[] {
    const invalidFields: string[] = []

    if (config.questionCount && (config.questionCount < 5 || config.questionCount > 20)) {
      invalidFields.push('questionCount')
    }
    if (config.studentLevel && !['PASS', 'LAS', 'both'].includes(config.studentLevel)) {
      invalidFields.push('studentLevel')
    }
    if (config.difficulty && !['easy', 'medium', 'hard'].includes(config.difficulty)) {
      invalidFields.push('difficulty')
    }

    return invalidFields
  }

  /**
   * Détermine la stratégie de récupération appropriée
   */
  private async determineRecoveryStrategy(
    error: AIQuizError,
    context: { userId?: string; config?: Record<string, any> }
  ): Promise<RecoveryStrategy | undefined> {
    if (!context.userId) return undefined

    try {
      switch (error.type) {
        case AI_QUIZ_ERRORS.AI_RATE_LIMIT_EXCEEDED:
          return {
            canRecover: true,
            action: 'wait',
            message: 'Limite de taux atteinte. Veuillez attendre avant de réessayer.',
            retryAfterSeconds: error.retryAfterSeconds || 60
          }

        case AI_QUIZ_ERRORS.VALIDATION_FAILED:
          return {
            canRecover: true,
            action: 'adjust',
            message: 'Ajustement automatique des paramètres de génération.',
            details: {
              suggestion: 'Réduire la complexité ou ajuster la difficulté'
            }
          }

        case AI_QUIZ_ERRORS.CATEGORY_NOT_FOUND:
          return {
            canRecover: true,
            action: 'redirect',
            message: 'Catégorie introuvable. Redirection vers la gestion des catégories.',
            redirectUrl: '/admin/collections/categories'
          }

        default:
          return undefined
      }
    } catch (recoveryError) {
      console.error('Erreur lors de la détermination de la stratégie de récupération:', recoveryError)
      return undefined
    }
  }

  /**
   * Enregistre une erreur pour audit et monitoring
   */
  private async logAIQuizError(
    error: AIQuizError,
    context: { userId?: string; operation: string; config?: Record<string, any> }
  ): Promise<void> {
    try {
      await this.errorHandlingService.logError({
        type: ADAPTIVE_QUIZ_ERRORS.TECHNICAL_ERROR,
        message: `AI Quiz Error: ${error.message}`,
        details: {
          aiQuizErrorType: error.type,
          aiQuizErrorDetails: error.details,
          operation: context.operation,
          config: context.config,
          severity: error.severity,
          retryable: error.retryable
        },
        timestamp: error.timestamp,
        userId: error.userId,
        context: `ai_quiz_${context.operation}`
      })
    } catch (logError) {
      console.error('Erreur lors du logging de l\'erreur IA:', logError)
    }
  }

  /**
   * Enregistre une métrique d'erreur
   */
  private recordErrorMetric(errorType: AIQuizErrorType): void {
    const current = this.errorMetrics.get(errorType) || 0
    this.errorMetrics.set(errorType, current + 1)
  }

  /**
   * Calcule le délai de retry avec backoff exponentiel
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.BASE_RETRY_DELAY * Math.pow(2, attempt),
      this.MAX_RETRY_DELAY
    )
    
    // Ajouter du jitter pour éviter les thundering herds
    const jitter = Math.random() * 0.1 * delay
    return Math.floor(delay + jitter)
  }

  // Méthodes de récupération spécialisées

  private async recoverFromRateLimit(
    context: Record<string, any>,
    attempt: number
  ): Promise<{ success: boolean; shouldRetry: boolean; retryDelay?: number }> {
    const retryDelay = Math.max(60000, this.calculateRetryDelay(attempt)) // Au moins 1 minute
    
    return {
      success: false,
      shouldRetry: attempt < this.MAX_RETRIES,
      retryDelay
    }
  }

  private async recoverFromTemporaryFailure(
    context: Record<string, any>,
    attempt: number
  ): Promise<{ success: boolean; shouldRetry: boolean; retryDelay?: number }> {
    return {
      success: false,
      shouldRetry: attempt < this.MAX_RETRIES,
      retryDelay: this.calculateRetryDelay(attempt)
    }
  }

  private async recoverFromValidationFailure(
    context: Record<string, any>,
    attempt: number
  ): Promise<{ success: boolean; shouldRetry: boolean; result?: any }> {
    // Tenter d'ajuster automatiquement les paramètres
    if (context.config && attempt < 2) {
      const adjustedConfig = {
        ...context.config,
        questionCount: Math.max(5, Math.floor(context.config.questionCount * 0.8)),
        difficulty: context.config.difficulty === 'hard' ? 'medium' : 'easy'
      }

      return {
        success: true,
        shouldRetry: true,
        result: { adjustedConfig }
      }
    }

    return {
      success: false,
      shouldRetry: false
    }
  }

  private async recoverFromInvalidJSON(
    context: Record<string, any>,
    attempt: number
  ): Promise<{ success: boolean; shouldRetry: boolean }> {
    return {
      success: false,
      shouldRetry: attempt < this.MAX_RETRIES
    }
  }

  /**
   * Obtient les métriques d'erreurs pour monitoring
   */
  getErrorMetrics(): Record<AIQuizErrorType, number> {
    return Object.fromEntries(this.errorMetrics) as Record<AIQuizErrorType, number>
  }

  /**
   * Réinitialise les métriques d'erreurs
   */
  resetErrorMetrics(): void {
    this.errorMetrics.clear()
  }
}