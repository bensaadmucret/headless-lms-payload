/**
 * Service intégré pour la génération robuste de quiz IA
 * Combine tous les services de gestion d'erreurs de la tâche 8
 */

import type { Payload } from 'payload'
import { AIQuizGenerationService } from './AIQuizGenerationService'
import { AIQuizErrorManager, type AIQuizErrorResponse } from './AIQuizErrorManager'
import { AIQuizValidationService, type ValidationResult } from './AIQuizValidationService'
import { AIQuizRateLimitService, type RateLimitStatus } from './AIQuizRateLimitService'
import { AIAPIService } from './AIAPIService'

export interface RobustGenerationConfig {
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
  userId: string
  published?: boolean
  maxRetries?: number
  enableAutoRecovery?: boolean
}

export interface RobustGenerationResult {
  success: boolean
  data?: {
    quizId: string
    questionIds: string[]
    questionsCreated: number
    validationScore: number
    generationTime: number
    metadata: Record<string, any>
    attemptsUsed: number
    recoveryActions: string[]
  }
  error?: AIQuizErrorResponse
  rateLimitInfo?: {
    remainingRequests: { hourly: number; daily: number; burst: number }
    resetTimes: { hourly: Date; daily: Date; burst?: Date }
  }
  validationReport?: string
  performanceMetrics?: {
    totalTime: number
    validationTime: number
    generationTime: number
    retryTime: number
    apiCalls: number
  }
}

/**
 * Service principal pour la génération robuste de quiz IA
 */
export class AIQuizRobustService {
  private errorManager: AIQuizErrorManager
  private validationService: AIQuizValidationService
  private rateLimitService: AIQuizRateLimitService
  private generationService: AIQuizGenerationService
  private apiService: AIAPIService

  constructor(private payload: Payload) {
    this.errorManager = new AIQuizErrorManager(payload)
    this.validationService = new AIQuizValidationService(payload)
    this.rateLimitService = new AIQuizRateLimitService(payload)
    this.generationService = new AIQuizGenerationService(payload)
    this.apiService = new AIAPIService()
  }

  /**
   * Génère un quiz avec gestion d'erreurs complète et robuste
   */
  async generateQuizRobust(config: RobustGenerationConfig): Promise<RobustGenerationResult> {
    const startTime = Date.now()
    const performanceMetrics = {
      totalTime: 0,
      validationTime: 0,
      generationTime: 0,
      retryTime: 0,
      apiCalls: 0
    }
    
    let attemptsUsed = 0
    const recoveryActions: string[] = []
    const maxRetries = config.maxRetries || 3

    try {
      console.log('🚀 Début génération robuste de quiz IA:', {
        subject: config.subject,
        level: config.studentLevel,
        questions: config.questionCount,
        userId: config.userId
      })

      // 1. Vérification du rate limiting
      const rateLimitStart = Date.now()
      const rateLimitStatus = await this.rateLimitService.checkRateLimit(config.userId, 'quiz_generation')
      
      if (!rateLimitStatus.allowed) {
        const rateLimitError = await this.errorManager.handleAIQuizError(
          `Rate limit exceeded: ${rateLimitStatus.reason}`,
          { userId: config.userId, operation: 'generation' }
        )

        return {
          success: false,
          error: rateLimitError,
          rateLimitInfo: {
            remainingRequests: rateLimitStatus.remainingRequests,
            resetTimes: rateLimitStatus.resetTimes
          },
          performanceMetrics: {
            ...performanceMetrics,
            totalTime: Date.now() - startTime
          }
        }
      }

      // 2. Validation complète des paramètres
      const validationStart = Date.now()
      const validationResult = await this.validationService.validateGenerationConfig(config)
      performanceMetrics.validationTime = Date.now() - validationStart

      if (!validationResult.isValid) {
        const validationError = await this.errorManager.handleConfigurationError(
          config,
          validationResult.errors.map(e => e.message),
          { userId: config.userId }
        )

        return {
          success: false,
          error: validationError,
          validationReport: this.validationService.generateValidationReport(validationResult),
          performanceMetrics: {
            ...performanceMetrics,
            totalTime: Date.now() - startTime
          }
        }
      }

      // 3. Génération avec retry intelligent
      const generationResult = await this.generateWithIntelligentRetry(
        validationResult.sanitizedConfig,
        maxRetries,
        config.enableAutoRecovery || true,
        performanceMetrics,
        recoveryActions
      )

      if (!generationResult.success) {
        return {
          success: false,
          error: generationResult.error,
          rateLimitInfo: {
            remainingRequests: rateLimitStatus.remainingRequests,
            resetTimes: rateLimitStatus.resetTimes
          },
          performanceMetrics: {
            ...performanceMetrics,
            totalTime: Date.now() - startTime
          }
        }
      }

      // 4. Succès - préparer la réponse complète
      performanceMetrics.totalTime = Date.now() - startTime

      console.log(`✅ Quiz généré avec succès en ${performanceMetrics.totalTime}ms:`, {
        quizId: generationResult.data?.quizId,
        questionsCreated: generationResult.data?.questionsCreated,
        attemptsUsed: generationResult.attemptsUsed,
        recoveryActions: recoveryActions.length
      })

      return {
        success: true,
        data: {
          ...generationResult.data!,
          attemptsUsed: generationResult.attemptsUsed || 1,
          recoveryActions
        },
        rateLimitInfo: {
          remainingRequests: rateLimitStatus.remainingRequests,
          resetTimes: rateLimitStatus.resetTimes
        },
        performanceMetrics
      }

    } catch (error) {
      console.error('❌ Erreur critique dans generateQuizRobust:', error)
      
      const criticalError = await this.errorManager.handleAIQuizError(
        error as Error,
        { userId: config.userId, operation: 'generation', config }
      )

      return {
        success: false,
        error: criticalError,
        performanceMetrics: {
          ...performanceMetrics,
          totalTime: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Génération avec retry intelligent et récupération automatique
   */
  private async generateWithIntelligentRetry(
    config: any,
    maxRetries: number,
    enableAutoRecovery: boolean,
    performanceMetrics: any,
    recoveryActions: string[]
  ): Promise<{
    success: boolean
    data?: any
    error?: AIQuizErrorResponse
    attemptsUsed?: number
  }> {
    let lastError: any
    let currentConfig = { ...config }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const attemptStart = Date.now()
      
      try {
        console.log(`🔄 Tentative ${attempt + 1}/${maxRetries}`)
        
        // Tenter la génération
        const result = await this.generationService.generateAndCreateCompleteQuiz(currentConfig)
        performanceMetrics.generationTime += Date.now() - attemptStart
        performanceMetrics.apiCalls++

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
            },
            attemptsUsed: attempt + 1
          }
        }

        // Analyser l'échec et tenter une récupération
        const errorMessage = result.errors?.[0] || 'Génération échouée'
        lastError = new Error(errorMessage)

        if (enableAutoRecovery && attempt < maxRetries - 1) {
          const recoveryStart = Date.now()
          const recoveryResult = await this.attemptIntelligentRecovery(
            lastError,
            currentConfig,
            attempt,
            recoveryActions
          )
          performanceMetrics.retryTime += Date.now() - recoveryStart

          if (recoveryResult.success) {
            if (recoveryResult.adjustedConfig) {
              currentConfig = recoveryResult.adjustedConfig
              recoveryActions.push(`Tentative ${attempt + 1}: Configuration ajustée automatiquement`)
            }
            
            if (recoveryResult.retryDelay) {
              console.log(`⏳ Attente ${recoveryResult.retryDelay}ms avant retry`)
              await new Promise(resolve => setTimeout(resolve, recoveryResult.retryDelay))
            }
            
            continue
          }

          if (!recoveryResult.shouldRetry) {
            break
          }
        }

        // Attendre avant le prochain retry
        const retryDelay = this.calculateRetryDelay(attempt)
        console.log(`⏳ Attente ${retryDelay}ms avant retry`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))

      } catch (error) {
        console.error(`❌ Erreur lors de la tentative ${attempt + 1}:`, error)
        lastError = error
        performanceMetrics.generationTime += Date.now() - attemptStart
        performanceMetrics.apiCalls++

        // Pour les erreurs critiques, arrêter immédiatement
        if (this.isCriticalError(error as Error)) {
          break
        }
      }
    }

    // Toutes les tentatives ont échoué
    const errorResponse = await this.errorManager.handleAIQuizError(
      lastError,
      { userId: config.userId, operation: 'generation', config, attempt: maxRetries }
    )

    return {
      success: false,
      error: errorResponse,
      attemptsUsed: maxRetries
    }
  }

  /**
   * Tente une récupération intelligente selon le type d'erreur
   */
  private async attemptIntelligentRecovery(
    error: Error,
    config: any,
    attempt: number,
    recoveryActions: string[]
  ): Promise<{
    success: boolean
    shouldRetry: boolean
    adjustedConfig?: any
    retryDelay?: number
  }> {
    const errorMessage = error.message.toLowerCase()

    // Récupération pour erreurs de validation
    if (errorMessage.includes('validation') || errorMessage.includes('quality')) {
      recoveryActions.push(`Tentative ${attempt + 1}: Ajustement pour problème de validation`)
      
      return {
        success: true,
        shouldRetry: true,
        adjustedConfig: {
          ...config,
          questionCount: Math.max(5, Math.floor(config.questionCount * 0.8)),
          difficulty: config.difficulty === 'hard' ? 'medium' : 'easy',
          customInstructions: config.customInstructions ? 
            config.customInstructions + ' Privilégiez la clarté et la simplicité.' : 
            'Privilégiez la clarté et la simplicité.'
        }
      }
    }

    // Récupération pour erreurs d'API
    if (errorMessage.includes('rate limit') || errorMessage.includes('quota')) {
      recoveryActions.push(`Tentative ${attempt + 1}: Attente pour rate limit`)
      
      return {
        success: true,
        shouldRetry: true,
        retryDelay: 60000 // 1 minute
      }
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('overloaded')) {
      recoveryActions.push(`Tentative ${attempt + 1}: Réduction de complexité pour timeout`)
      
      return {
        success: true,
        shouldRetry: true,
        adjustedConfig: {
          ...config,
          questionCount: Math.max(5, config.questionCount - 2),
          customInstructions: undefined // Simplifier le prompt
        },
        retryDelay: 5000 * (attempt + 1) // Délai progressif
      }
    }

    // Récupération pour erreurs de contenu
    if (errorMessage.includes('json') || errorMessage.includes('format')) {
      recoveryActions.push(`Tentative ${attempt + 1}: Simplification du prompt pour format JSON`)
      
      return {
        success: true,
        shouldRetry: true,
        adjustedConfig: {
          ...config,
          customInstructions: 'Répondez uniquement en JSON valide selon le format demandé.'
        }
      }
    }

    // Récupération pour erreurs de base de données
    if (errorMessage.includes('database') || errorMessage.includes('creation')) {
      recoveryActions.push(`Tentative ${attempt + 1}: Retry pour erreur de base de données`)
      
      return {
        success: true,
        shouldRetry: true,
        retryDelay: 2000 * (attempt + 1)
      }
    }

    // Pas de récupération possible
    return {
      success: false,
      shouldRetry: attempt < 2 // Retry générique pour les 2 premières tentatives
    }
  }

  /**
   * Détermine si une erreur est critique et doit arrêter les tentatives
   */
  private isCriticalError(error: Error): boolean {
    const criticalPatterns = [
      /authentication/i,
      /permission/i,
      /unauthorized/i,
      /forbidden/i,
      /invalid.*key/i,
      /billing/i
    ]

    return criticalPatterns.some(pattern => pattern.test(error.message))
  }

  /**
   * Calcule le délai de retry avec backoff exponentiel
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = 2000 // 2 secondes
    const maxDelay = 30000 // 30 secondes
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
    
    // Ajouter du jitter pour éviter les thundering herds
    const jitter = Math.random() * 0.1 * delay
    return Math.floor(delay + jitter)
  }

  /**
   * Teste la disponibilité de tous les services
   */
  async testServiceAvailability(): Promise<{
    overall: 'healthy' | 'degraded' | 'unavailable'
    services: {
      aiApi: { available: boolean; responseTime: number; error?: string }
      database: { available: boolean; responseTime: number; error?: string }
      validation: { available: boolean; responseTime: number; error?: string }
      rateLimit: { available: boolean; responseTime: number; error?: string }
    }
  }> {
    const results = {
      overall: 'healthy' as const,
      services: {
        aiApi: { available: false, responseTime: 0 },
        database: { available: false, responseTime: 0 },
        validation: { available: false, responseTime: 0 },
        rateLimit: { available: false, responseTime: 0 }
      }
    }

    // Test API IA
    try {
      const apiTest = await this.apiService.testAPIAvailability()
      results.services.aiApi = apiTest
    } catch (error) {
      results.services.aiApi = {
        available: false,
        responseTime: 0,
        error: (error as Error).message
      }
    }

    // Test base de données
    try {
      const dbStart = Date.now()
      await this.payload.find({ collection: 'users', limit: 1 })
      results.services.database = {
        available: true,
        responseTime: Date.now() - dbStart
      }
    } catch (error) {
      results.services.database = {
        available: false,
        responseTime: 0,
        error: (error as Error).message
      }
    }

    // Test validation
    try {
      const validationStart = Date.now()
      await this.validationService.validateGenerationConfig({
        subject: 'Test',
        categoryId: 'test',
        studentLevel: 'PASS',
        questionCount: 5,
        includeExplanations: true,
        userId: 'test'
      })
      results.services.validation = {
        available: true,
        responseTime: Date.now() - validationStart
      }
    } catch (error) {
      results.services.validation = {
        available: false,
        responseTime: 0,
        error: (error as Error).message
      }
    }

    // Test rate limiting
    try {
      const rateLimitStart = Date.now()
      await this.rateLimitService.checkRateLimit('test-user', 'health-check')
      results.services.rateLimit = {
        available: true,
        responseTime: Date.now() - rateLimitStart
      }
    } catch (error) {
      results.services.rateLimit = {
        available: false,
        responseTime: 0,
        error: (error as Error).message
      }
    }

    // Déterminer l'état global
    const availableServices = Object.values(results.services).filter(s => s.available).length
    const totalServices = Object.keys(results.services).length

    if (availableServices === totalServices) {
      results.overall = 'healthy'
    } else if (availableServices >= totalServices / 2) {
      results.overall = 'degraded'
    } else {
      results.overall = 'unavailable'
    }

    return results
  }

  /**
   * Obtient les métriques de performance et d'erreurs
   */
  async getServiceMetrics(): Promise<{
    errorMetrics: Record<string, number>
    rateLimitStats: any
    apiPerformance: any
    systemHealth: string
  }> {
    return {
      errorMetrics: this.errorManager.getErrorMetrics(),
      rateLimitStats: this.rateLimitService.getGlobalStats(),
      apiPerformance: this.apiService.getPerformanceMetrics(),
      systemHealth: (await this.testServiceAvailability()).overall
    }
  }

  /**
   * Nettoie les ressources et caches
   */
  cleanup(): void {
    this.apiService.cleanup()
    this.errorManager.resetErrorMetrics()
  }
}