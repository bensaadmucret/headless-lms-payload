/**
 * Endpoint robuste pour la génération de quiz IA avec gestion d'erreurs complète
 * Implémente la tâche 8: Gestion des erreurs et robustesse
 */

import type { PayloadRequest } from 'payload/types'
import type { Payload } from 'payload'
import { AIQuizErrorManager, type AIQuizErrorResponse } from '../services/AIQuizErrorManager'
import { AIQuizValidationService, type ValidationResult } from '../services/AIQuizValidationService'
import { AIQuizRateLimitService, type RateLimitStatus } from '../services/AIQuizRateLimitService'
import { AIQuizGenerationService } from '../services/AIQuizGenerationService'

interface GenerateQuizRequest {
  subject: string
  categoryId: string
  categoryName?: string
  courseId?: string
  courseName?: string
  studentLevel: 'PASS' | 'LAS' | 'both'
  questionCount: number
  difficulty?: 'easy' | 'medium' | 'hard'
  includeExplanations: boolean
  customInstructions?: string
  medicalDomain?: string
  retryAttempt?: number
}

interface GenerateQuizResponse {
  success: boolean
  data?: {
    quizId: string
    questionIds: string[]
    questionsCreated: number
    validationScore: number
    generationTime: number
    metadata: Record<string, any>
  }
  error?: {
    type: string
    message: string
    userMessage: string
    details?: Record<string, any>
    suggestion?: string
    actionUrl?: string
    timestamp: string
  }
  recovery?: {
    canRecover: boolean
    action?: string
    message: string
    retryAfterSeconds?: number
    fallbackOptions?: Array<{
      title: string
      description: string
      actionUrl: string
    }>
  }
  rateLimitInfo?: {
    remainingRequests: {
      hourly: number
      daily: number
      burst: number
    }
    resetTimes: {
      hourly: string
      daily: string
      burst?: string
    }
  }
  validationReport?: string
}

export const generateAIQuizRobust = async (req: PayloadRequest): Promise<Response> => {
  const payload = req.payload as Payload
  const startTime = Date.now()
  
  // Initialiser les services de gestion d'erreurs
  const errorManager = new AIQuizErrorManager(payload)
  const validationService = new AIQuizValidationService(payload)
  const rateLimitService = new AIQuizRateLimitService(payload)
  
  let userId: string | undefined
  let requestData: Partial<GenerateQuizRequest> = {}

  try {
    // 1. Authentification et autorisation
    const authResult = await validateAuthentication(req)
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401)
    }
    userId = authResult.userId

    // 2. Parsing et validation de base des données de requête
    try {
      requestData = await parseRequestData(req)
    } catch (parseError) {
      const errorResponse = await errorManager.handleAIQuizError(
        parseError as Error,
        { userId, operation: 'config' }
      )
      return createErrorResponse(errorResponse, 400)
    }

    // 3. Vérification du rate limiting
    const rateLimitStatus = await rateLimitService.checkRateLimit(userId, 'quiz_generation')
    if (!rateLimitStatus.allowed) {
      const rateLimitError = await errorManager.handleAIQuizError(
        `Rate limit exceeded: ${rateLimitStatus.reason}`,
        { userId, operation: 'generation', attempt: requestData.retryAttempt || 0 }
      )

      return createErrorResponse({
        ...rateLimitError,
        rateLimitInfo: {
          remainingRequests: rateLimitStatus.remainingRequests,
          resetTimes: {
            hourly: rateLimitStatus.resetTimes.hourly.toISOString(),
            daily: rateLimitStatus.resetTimes.daily.toISOString(),
            burst: rateLimitStatus.resetTimes.burst?.toISOString()
          }
        }
      }, 429)
    }

    // 4. Validation complète des paramètres
    const validationResult = await validationService.validateGenerationConfig({
      ...requestData,
      userId
    } as any)

    if (!validationResult.isValid) {
      const validationError = await errorManager.handleConfigurationError(
        requestData,
        validationResult.errors.map(e => e.message),
        { userId }
      )

      return createErrorResponse({
        ...validationError,
        validationReport: validationService.generateValidationReport(validationResult)
      }, 400)
    }

    // 5. Génération du quiz avec gestion d'erreurs robuste
    const generationResult = await generateQuizWithRetry(
      validationResult.sanitizedConfig,
      userId,
      requestData.retryAttempt || 0,
      errorManager,
      payload
    )

    if (!generationResult.success) {
      return createErrorResponse(generationResult, 500)
    }

    // 6. Réponse de succès avec informations complètes
    const response: GenerateQuizResponse = {
      success: true,
      data: generationResult.data,
      rateLimitInfo: {
        remainingRequests: rateLimitStatus.remainingRequests,
        resetTimes: {
          hourly: rateLimitStatus.resetTimes.hourly.toISOString(),
          daily: rateLimitStatus.resetTimes.daily.toISOString(),
          burst: rateLimitStatus.resetTimes.burst?.toISOString()
        }
      }
    }

    // Logger le succès
    console.log(`✅ Quiz généré avec succès en ${Date.now() - startTime}ms:`, {
      userId,
      quizId: generationResult.data?.quizId,
      questionsCreated: generationResult.data?.questionsCreated,
      validationScore: generationResult.data?.validationScore
    })

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Erreur critique dans generateAIQuizRobust:', error)
    
    // Gestion d'erreur de dernier recours
    const criticalErrorResponse = await errorManager.handleAIQuizError(
      error as Error,
      { userId, operation: 'generation', config: requestData }
    )

    return createErrorResponse(criticalErrorResponse, 500)
  }
}

/**
 * Valide l'authentification et les permissions
 */
async function validateAuthentication(req: PayloadRequest): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  try {
    const user = req.user
    
    if (!user) {
      return {
        success: false,
        error: 'Authentification requise'
      }
    }

    // Vérifier les permissions
    const userRole = (user as any).role
    if (!userRole || !['admin', 'teacher'].includes(userRole)) {
      return {
        success: false,
        error: 'Permissions insuffisantes pour générer des quiz IA'
      }
    }

    // Vérifier que l'utilisateur est actif
    if ((user as any).status === 'inactive') {
      return {
        success: false,
        error: 'Compte utilisateur inactif'
      }
    }

    return {
      success: true,
      userId: user.id.toString()
    }

  } catch (error) {
    return {
      success: false,
      error: 'Erreur lors de la validation de l\'authentification'
    }
  }
}

/**
 * Parse et valide les données de la requête
 */
async function parseRequestData(req: PayloadRequest): Promise<Partial<GenerateQuizRequest>> {
  const body = req.json || req.body

  if (!body) {
    throw new Error('Corps de requête manquant')
  }

  // Validation des types de base
  const data: Partial<GenerateQuizRequest> = {}

  if (typeof body.subject === 'string') {
    data.subject = body.subject.trim()
  }

  if (typeof body.categoryId === 'string') {
    data.categoryId = body.categoryId.trim()
  }

  if (typeof body.categoryName === 'string') {
    data.categoryName = body.categoryName.trim()
  }

  if (typeof body.courseId === 'string') {
    data.courseId = body.courseId.trim()
  }

  if (typeof body.courseName === 'string') {
    data.courseName = body.courseName.trim()
  }

  if (typeof body.studentLevel === 'string') {
    data.studentLevel = body.studentLevel as 'PASS' | 'LAS' | 'both'
  }

  if (typeof body.questionCount === 'number') {
    data.questionCount = Math.floor(body.questionCount)
  }

  if (typeof body.difficulty === 'string') {
    data.difficulty = body.difficulty as 'easy' | 'medium' | 'hard'
  }

  if (typeof body.includeExplanations === 'boolean') {
    data.includeExplanations = body.includeExplanations
  }

  if (typeof body.customInstructions === 'string') {
    data.customInstructions = body.customInstructions.trim()
  }

  if (typeof body.medicalDomain === 'string') {
    data.medicalDomain = body.medicalDomain.trim()
  }

  if (typeof body.retryAttempt === 'number') {
    data.retryAttempt = Math.floor(body.retryAttempt)
  }

  return data
}

/**
 * Génère un quiz avec retry automatique et gestion d'erreurs
 */
async function generateQuizWithRetry(
  config: any,
  userId: string,
  attempt: number,
  errorManager: AIQuizErrorManager,
  payload: Payload
): Promise<{
  success: boolean
  data?: any
  error?: AIQuizErrorResponse
}> {
  const maxAttempts = 3
  let lastError: any

  for (let currentAttempt = attempt; currentAttempt < maxAttempts; currentAttempt++) {
    try {
      console.log(`🔄 Tentative de génération ${currentAttempt + 1}/${maxAttempts}`)

      // Initialiser le service de génération
      const generationService = new AIQuizGenerationService(payload)

      // Tenter la génération
      const result = await generationService.generateAndCreateCompleteQuiz({
        ...config,
        userId
      })

      if (result.success) {
        return {
          success: true,
          data: {
            quizId: result.quizId,
            questionIds: result.questionIds,
            questionsCreated: result.questionsCreated,
            validationScore: result.validationScore || 0,
            generationTime: result.metadata?.processingTime || 0,
            metadata: result.metadata
          }
        }
      }

      // La génération a échoué, analyser l'erreur
      const errorMessage = result.errors?.[0] || 'Génération échouée'
      lastError = new Error(errorMessage)

      // Vérifier si on peut tenter une récupération automatique
      const recoveryResult = await errorManager.attemptAutoRecovery(
        'ai_api_unavailable' as any,
        { userId, config, attempt: currentAttempt }
      )

      if (recoveryResult.success && recoveryResult.result) {
        // Ajuster la configuration selon la récupération
        if (recoveryResult.result.adjustedConfig) {
          Object.assign(config, recoveryResult.result.adjustedConfig)
          console.log('🔧 Configuration ajustée automatiquement')
        }
        
        // Attendre avant le retry si nécessaire
        if (recoveryResult.retryDelay) {
          console.log(`⏳ Attente ${recoveryResult.retryDelay}ms avant retry`)
          await new Promise(resolve => setTimeout(resolve, recoveryResult.retryDelay))
        }
        
        continue // Retry avec la configuration ajustée
      }

      if (!recoveryResult.shouldRetry) {
        break // Arrêter les tentatives
      }

      // Attendre avant le prochain retry
      const retryDelay = Math.min(2000 * Math.pow(2, currentAttempt), 10000)
      console.log(`⏳ Attente ${retryDelay}ms avant retry`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))

    } catch (error) {
      console.error(`❌ Erreur lors de la tentative ${currentAttempt + 1}:`, error)
      lastError = error

      // Pour les erreurs critiques, arrêter immédiatement
      if (error.message?.includes('authentication') || error.message?.includes('permission')) {
        break
      }
    }
  }

  // Toutes les tentatives ont échoué
  const errorResponse = await errorManager.handleAIQuizError(
    lastError,
    { userId, operation: 'generation', config, attempt: maxAttempts }
  )

  return {
    success: false,
    error: errorResponse
  }
}

/**
 * Crée une réponse d'erreur standardisée
 */
function createErrorResponse(
  errorData: any,
  statusCode: number
): Response {
  const response: GenerateQuizResponse = {
    success: false,
    error: errorData.error,
    recovery: errorData.recovery,
    rateLimitInfo: errorData.rateLimitInfo,
    validationReport: errorData.validationReport
  }

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Middleware de gestion d'erreurs globales pour l'endpoint
 */
export const handleAIQuizGenerationErrors = (handler: Function) => {
  return async (req: PayloadRequest): Promise<Response> => {
    try {
      return await handler(req)
    } catch (error) {
      console.error('❌ Erreur non gérée dans l\'endpoint AI Quiz:', error)
      
      const errorResponse: GenerateQuizResponse = {
        success: false,
        error: {
          type: 'CRITICAL_ERROR',
          message: 'Erreur système critique',
          userMessage: 'Une erreur inattendue s\'est produite. Veuillez réessayer plus tard.',
          timestamp: new Date().toISOString()
        }
      }

      return new Response(JSON.stringify(errorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

// Export de l'endpoint avec gestion d'erreurs
export default handleAIQuizGenerationErrors(generateAIQuizRobust)