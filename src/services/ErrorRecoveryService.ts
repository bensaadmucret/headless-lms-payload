import type { Payload } from 'payload'
import { ADAPTIVE_QUIZ_ERRORS, type AdaptiveQuizErrorType, ErrorHandlingService } from './ErrorHandlingService'

// Interface pour les stratégies de récupération
export interface RecoveryStrategy {
  canRecover: boolean
  action?: 'retry' | 'redirect' | 'adjust' | 'fallback' | 'wait'
  message: string
  details?: Record<string, any>
  retryAfterSeconds?: number
  redirectUrl?: string
  fallbackData?: any
}

// Interface pour les suggestions d'actions utilisateur
export interface UserActionSuggestion {
  title: string
  description: string
  actionType: 'navigate' | 'complete_profile' | 'take_quiz' | 'wait' | 'contact_support'
  actionUrl?: string
  priority: 'high' | 'medium' | 'low'
  estimatedTimeMinutes?: number
}

export class ErrorRecoveryService {
  private errorHandlingService: ErrorHandlingService

  constructor(private payload: Payload) {
    this.errorHandlingService = new ErrorHandlingService(payload)
  }

  /**
   * Gère les erreurs de données insuffisantes avec suggestions d'actions
   */
  async handleInsufficientData(userId: string): Promise<RecoveryStrategy> {
    try {
      // Analyser l'état actuel de l'utilisateur
      const userStats = await this.getUserQuizStats(userId)
      const missingQuizzes = Math.max(0, 3 - userStats.completedQuizzes)

      const suggestions: UserActionSuggestion[] = [
        {
          title: 'Complétez des quiz réguliers',
          description: `Il vous manque ${missingQuizzes} quiz pour débloquer les quiz adaptatifs`,
          actionType: 'take_quiz',
          actionUrl: '/student/quizzes',
          priority: 'high',
          estimatedTimeMinutes: missingQuizzes * 15
        }
      ]

      // Ajouter des suggestions spécifiques selon les catégories manquantes
      if (userStats.categoriesWithQuizzes.length < 2) {
        suggestions.push({
          title: 'Diversifiez vos quiz',
          description: 'Essayez des quiz dans différentes catégories pour une meilleure analyse',
          actionType: 'take_quiz',
          actionUrl: '/student/quizzes?filter=categories',
          priority: 'medium',
          estimatedTimeMinutes: 20
        })
      }

      return {
        canRecover: true,
        action: 'redirect',
        message: `Vous devez compléter ${missingQuizzes} quiz supplémentaires pour débloquer les quiz adaptatifs.`,
        redirectUrl: '/student/quizzes',
        details: {
          currentQuizzes: userStats.completedQuizzes,
          requiredQuizzes: 3,
          missingQuizzes,
          suggestions,
          progress: (userStats.completedQuizzes / 3) * 100
        }
      }
    } catch (error) {
      return this.createFallbackRecovery('Impossible d\'analyser vos données actuelles')
    }
  }

  /**
   * Gère les erreurs de questions insuffisantes avec ajustement automatique
   */
  async handleInsufficientQuestions(
    userId: string, 
    weakCategories: string[], 
    strongCategories: string[]
  ): Promise<RecoveryStrategy> {
    try {
      // Analyser la disponibilité des questions par catégorie
      const questionAvailability = await this.analyzeQuestionAvailability(userId, weakCategories, strongCategories)
      
      // Tenter un ajustement automatique de la sélection
      const adjustedSelection = await this.adjustQuestionSelection(questionAvailability)

      if (adjustedSelection.canGenerate) {
        return {
          canRecover: true,
          action: 'adjust',
          message: 'Sélection de questions ajustée automatiquement selon la disponibilité',
          details: {
            originalWeakCategories: weakCategories,
            originalStrongCategories: strongCategories,
            adjustedWeakCategories: adjustedSelection.adjustedWeakCategories,
            adjustedStrongCategories: adjustedSelection.adjustedStrongCategories,
            adjustmentReason: adjustedSelection.reason,
            questionCounts: adjustedSelection.questionCounts
          },
          fallbackData: {
            weakCategories: adjustedSelection.adjustedWeakCategories,
            strongCategories: adjustedSelection.adjustedStrongCategories,
            config: adjustedSelection.config
          }
        }
      }

      // Si l'ajustement automatique échoue, suggérer des actions
      const suggestions = await this.generateQuestionAvailabilitySuggestions(questionAvailability)

      return {
        canRecover: false,
        action: 'redirect',
        message: 'Pas assez de questions disponibles dans vos catégories. Complétez plus de quiz pour élargir la sélection.',
        redirectUrl: '/student/quizzes',
        details: {
          questionAvailability,
          suggestions,
          minimumQuestionsNeeded: 7,
          currentQuestionsAvailable: questionAvailability.totalAvailable
        }
      }
    } catch (error) {
      return this.createFallbackRecovery('Erreur lors de l\'analyse des questions disponibles')
    }
  }

  /**
   * Gère les erreurs de profil incomplet avec redirection vers profil
   */
  async handleProfileIncomplete(userId: string): Promise<RecoveryStrategy> {
    try {
      // Analyser les champs manquants du profil
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      })

      const missingFields = this.identifyMissingProfileFields(user)
      const suggestions = this.generateProfileCompletionSuggestions(missingFields)

      return {
        canRecover: true,
        action: 'redirect',
        message: 'Votre profil doit être complété pour générer des quiz adaptatifs personnalisés.',
        redirectUrl: '/profile',
        details: {
          missingFields,
          suggestions,
          completionPercentage: this.calculateProfileCompletion(user),
          estimatedTimeMinutes: missingFields.length * 2
        }
      }
    } catch (error) {
      return {
        canRecover: true,
        action: 'redirect',
        message: 'Veuillez compléter votre profil pour accéder aux quiz adaptatifs.',
        redirectUrl: '/profile'
      }
    }
  }

  /**
   * Gère les erreurs techniques avec retry automatique et fallback
   */
  async handleTechnicalError(
    error: Error,
    context: string,
    retryCount: number = 0
  ): Promise<RecoveryStrategy> {
    const maxRetries = 3
    const baseRetryDelay = 2 // secondes

    // Analyser le type d'erreur technique
    const errorAnalysis = this.analyzeTechnicalError(error)

    if (retryCount < maxRetries && errorAnalysis.isRetryable) {
      const retryDelay = baseRetryDelay * Math.pow(2, retryCount) // Exponential backoff

      return {
        canRecover: true,
        action: 'retry',
        message: `Erreur temporaire détectée. Nouvelle tentative dans ${retryDelay} secondes...`,
        retryAfterSeconds: retryDelay,
        details: {
          errorType: errorAnalysis.type,
          retryCount: retryCount + 1,
          maxRetries,
          context,
          originalError: error.message,
          isRetryable: errorAnalysis.isRetryable,
          estimatedRecoveryTime: retryDelay
        }
      }
    }

    // Si les retries sont épuisés ou l'erreur n'est pas retryable
    const fallbackStrategy = await this.createTechnicalErrorFallback(errorAnalysis, context)

    return {
      canRecover: fallbackStrategy.canRecover,
      action: 'fallback',
      message: fallbackStrategy.message,
      redirectUrl: fallbackStrategy.redirectUrl,
      details: {
        errorType: errorAnalysis.type,
        retriesExhausted: retryCount >= maxRetries,
        context,
        fallbackReason: fallbackStrategy.reason,
        supportTicketId: fallbackStrategy.supportTicketId
      }
    }
  }

  /**
   * Gère les erreurs de limite de taux avec temps d'attente
   */
  async handleRateLimitExceeded(
    userId: string,
    limitType: 'daily' | 'cooldown'
  ): Promise<RecoveryStrategy> {
    try {
      const waitTime = await this.calculateWaitTime(userId, limitType)
      const suggestions = this.generateRateLimitSuggestions(limitType, waitTime)

      if (limitType === 'daily') {
        return {
          canRecover: true,
          action: 'wait',
          message: `Limite quotidienne atteinte. Revenez demain pour générer de nouveaux quiz adaptatifs.`,
          retryAfterSeconds: waitTime.secondsUntilReset,
          details: {
            limitType: 'daily',
            currentUsage: waitTime.currentUsage,
            maxUsage: waitTime.maxUsage,
            resetTime: waitTime.resetTime,
            suggestions,
            alternativeActions: [
              {
                title: 'Quiz réguliers',
                description: 'Continuez avec les quiz réguliers en attendant',
                actionUrl: '/student/quizzes'
              },
              {
                title: 'Réviser les résultats',
                description: 'Consultez vos résultats précédents',
                actionUrl: '/student/results'
              }
            ]
          }
        }
      } else {
        return {
          canRecover: true,
          action: 'wait',
          message: `Période d'attente active. Vous pourrez générer un nouveau quiz dans ${Math.ceil(waitTime.secondsUntilReset / 60)} minutes.`,
          retryAfterSeconds: waitTime.secondsUntilReset,
          details: {
            limitType: 'cooldown',
            remainingMinutes: Math.ceil(waitTime.secondsUntilReset / 60),
            lastQuizTime: waitTime.lastActionTime,
            suggestions,
            cooldownReason: 'Pour optimiser l\'analyse de vos performances'
          }
        }
      }
    } catch (error) {
      return this.createFallbackRecovery('Erreur lors du calcul du temps d\'attente')
    }
  }

  /**
   * Analyse les statistiques de quiz d'un utilisateur
   */
  private async getUserQuizStats(userId: string): Promise<{
    completedQuizzes: number
    categoriesWithQuizzes: string[]
    averageScore: number
    lastQuizDate?: string
  }> {
    try {
      const submissions = await this.payload.find({
        collection: 'quiz-submissions' as any,
        where: {
          and: [
            { user: { equals: userId } },
            { status: { equals: 'completed' } }
          ]
        },
        depth: 2
      })

      const categories = new Set<string>()
      let totalScore = 0

      submissions.docs.forEach((submission: any) => {
        if (submission.quiz?.category) {
          categories.add(submission.quiz.category.id || submission.quiz.category)
        }
        if (submission.score !== undefined) {
          totalScore += submission.score
        }
      })

      return {
        completedQuizzes: submissions.totalDocs,
        categoriesWithQuizzes: Array.from(categories),
        averageScore: submissions.totalDocs > 0 ? totalScore / submissions.totalDocs : 0,
        lastQuizDate: submissions.docs[0]?.createdAt
      }
    } catch (error) {
      // Fallback if collection doesn't exist or has different structure
      return {
        completedQuizzes: 0,
        categoriesWithQuizzes: [],
        averageScore: 0
      }
    }
  }

  /**
   * Analyse la disponibilité des questions par catégorie
   */
  private async analyzeQuestionAvailability(
    userId: string,
    weakCategories: string[],
    strongCategories: string[]
  ): Promise<{
    weakCategoriesAvailable: Record<string, number>
    strongCategoriesAvailable: Record<string, number>
    totalAvailable: number
    userLevel: string
  }> {
    try {
      // Récupérer le niveau de l'utilisateur
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      }) as any

      const userLevel = user.studentLevel || 'both'

      // Analyser les questions disponibles pour les catégories faibles
      const weakCategoriesAvailable: Record<string, number> = {}
      for (const categoryId of weakCategories) {
        const questions = await this.payload.find({
          collection: 'questions',
          where: {
            and: [
              { category: { equals: categoryId } },
              {
                or: [
                  { studentLevel: { equals: userLevel } },
                  { studentLevel: { equals: 'both' } }
                ]
              }
            ]
          },
          limit: 0 // Juste pour compter
        })
        weakCategoriesAvailable[categoryId] = questions.totalDocs
      }

      // Analyser les questions disponibles pour les catégories fortes
      const strongCategoriesAvailable: Record<string, number> = {}
      for (const categoryId of strongCategories) {
        const questions = await this.payload.find({
          collection: 'questions',
          where: {
            and: [
              { category: { equals: categoryId } },
              {
                or: [
                  { studentLevel: { equals: userLevel } },
                  { studentLevel: { equals: 'both' } }
                ]
              }
            ]
          },
          limit: 0
        })
        strongCategoriesAvailable[categoryId] = questions.totalDocs
      }

      const totalAvailable = Object.values(weakCategoriesAvailable).reduce((sum, count) => sum + count, 0) +
                            Object.values(strongCategoriesAvailable).reduce((sum, count) => sum + count, 0)

      return {
        weakCategoriesAvailable,
        strongCategoriesAvailable,
        totalAvailable,
        userLevel
      }
    } catch (error) {
      // Fallback if user or questions don't exist
      return {
        weakCategoriesAvailable: {},
        strongCategoriesAvailable: {},
        totalAvailable: 0,
        userLevel: 'both'
      }
    }
  }

  /**
   * Ajuste la sélection de questions selon la disponibilité
   */
  private async adjustQuestionSelection(questionAvailability: any): Promise<{
    canGenerate: boolean
    adjustedWeakCategories: string[]
    adjustedStrongCategories: string[]
    reason: string
    questionCounts: Record<string, number>
    config: any
  }> {
    const minQuestionsNeeded = 7 // 5 faibles + 2 fortes par défaut
    
    if (questionAvailability.totalAvailable < minQuestionsNeeded) {
      return {
        canGenerate: false,
        adjustedWeakCategories: [],
        adjustedStrongCategories: [],
        reason: 'Pas assez de questions disponibles au total',
        questionCounts: {},
        config: {}
      }
    }

    // Identifier les catégories avec suffisamment de questions
    const viableWeakCategories = Object.entries(questionAvailability.weakCategoriesAvailable)
      .filter(([_, count]) => (count as number) >= 1)
      .sort(([_, a], [__, b]) => (b as number) - (a as number)) // Trier par nombre de questions disponibles
      .map(([categoryId]) => categoryId)

    const viableStrongCategories = Object.entries(questionAvailability.strongCategoriesAvailable)
      .filter(([_, count]) => (count as number) >= 1)
      .sort(([_, a], [__, b]) => (b as number) - (a as number))
      .map(([categoryId]) => categoryId)

    // Ajuster la configuration selon la disponibilité
    let weakQuestionsTarget = 5
    let strongQuestionsTarget = 2

    // Si pas assez de catégories fortes, redistribuer vers les faibles
    if (viableStrongCategories.length === 0) {
      weakQuestionsTarget = 7
      strongQuestionsTarget = 0
    } else if (viableStrongCategories.length === 1) {
      strongQuestionsTarget = 1
      weakQuestionsTarget = 6
    }

    // Vérifier si on peut satisfaire les exigences ajustées
    const totalWeakAvailable = viableWeakCategories.reduce((sum, catId) => 
      sum + questionAvailability.weakCategoriesAvailable[catId], 0)
    const totalStrongAvailable = viableStrongCategories.reduce((sum, catId) => 
      sum + questionAvailability.strongCategoriesAvailable[catId], 0)

    if (totalWeakAvailable < weakQuestionsTarget || totalStrongAvailable < strongQuestionsTarget) {
      return {
        canGenerate: false,
        adjustedWeakCategories: viableWeakCategories,
        adjustedStrongCategories: viableStrongCategories,
        reason: 'Pas assez de questions même après ajustement',
        questionCounts: {
          weakAvailable: totalWeakAvailable,
          strongAvailable: totalStrongAvailable,
          weakNeeded: weakQuestionsTarget,
          strongNeeded: strongQuestionsTarget
        },
        config: {}
      }
    }

    return {
      canGenerate: true,
      adjustedWeakCategories: viableWeakCategories.slice(0, 3), // Limiter à 3 catégories max
      adjustedStrongCategories: viableStrongCategories.slice(0, 2),
      reason: 'Sélection ajustée selon la disponibilité des questions',
      questionCounts: {
        weakAvailable: totalWeakAvailable,
        strongAvailable: totalStrongAvailable,
        weakTarget: weakQuestionsTarget,
        strongTarget: strongQuestionsTarget
      },
      config: {
        weakQuestionsCount: weakQuestionsTarget,
        strongQuestionsCount: strongQuestionsTarget
      }
    }
  }

  /**
   * Génère des suggestions pour améliorer la disponibilité des questions
   */
  private async generateQuestionAvailabilitySuggestions(questionAvailability: any): Promise<UserActionSuggestion[]> {
    const suggestions: UserActionSuggestion[] = []

    // Identifier les catégories avec peu de questions
    const lowQuestionCategories = Object.entries(questionAvailability.weakCategoriesAvailable)
      .filter(([_, count]) => (count as number) < 3)
      .map(([categoryId]) => categoryId)

    if (lowQuestionCategories.length > 0) {
      suggestions.push({
        title: 'Complétez plus de quiz',
        description: 'Certaines de vos catégories faibles ont peu de questions disponibles',
        actionType: 'take_quiz',
        actionUrl: '/student/quizzes',
        priority: 'high',
        estimatedTimeMinutes: 30
      })
    }

    suggestions.push({
      title: 'Explorez de nouvelles catégories',
      description: 'Essayez des quiz dans différentes matières pour élargir vos options',
      actionType: 'take_quiz',
      actionUrl: '/student/quizzes?filter=new',
      priority: 'medium',
      estimatedTimeMinutes: 20
    })

    return suggestions
  }

  /**
   * Identifie les champs manquants du profil utilisateur
   */
  private identifyMissingProfileFields(user: any): string[] {
    const requiredFields = ['studentLevel', 'firstName', 'lastName']
    const optionalFields = ['university', 'studyYear', 'specialization']
    
    const missingRequired = requiredFields.filter(field => !user[field])
    const missingOptional = optionalFields.filter(field => !user[field])
    
    return [...missingRequired, ...missingOptional.slice(0, 2)] // Limiter les optionnels
  }

  /**
   * Génère des suggestions pour compléter le profil
   */
  private generateProfileCompletionSuggestions(missingFields: string[]): UserActionSuggestion[] {
    const fieldLabels: Record<string, string> = {
      studentLevel: 'Niveau d\'études (PASS/LAS)',
      firstName: 'Prénom',
      lastName: 'Nom',
      university: 'Université',
      studyYear: 'Année d\'études',
      specialization: 'Spécialisation'
    }

    return missingFields.map(field => ({
      title: `Renseigner ${fieldLabels[field] || field}`,
      description: `Ce champ améliore la personnalisation de vos quiz`,
      actionType: 'complete_profile' as const,
      actionUrl: '/profile',
      priority: ['studentLevel', 'firstName', 'lastName'].includes(field) ? 'high' as const : 'medium' as const,
      estimatedTimeMinutes: 2
    }))
  }

  /**
   * Calcule le pourcentage de completion du profil
   */
  private calculateProfileCompletion(user: any): number {
    const allFields = ['studentLevel', 'firstName', 'lastName', 'university', 'studyYear', 'specialization']
    const completedFields = allFields.filter(field => user[field])
    return Math.round((completedFields.length / allFields.length) * 100)
  }

  /**
   * Analyse le type d'erreur technique pour déterminer si elle est retryable
   */
  private analyzeTechnicalError(error: Error): {
    type: string
    isRetryable: boolean
    severity: 'low' | 'medium' | 'high'
  } {
    const message = error.message.toLowerCase()
    
    // Erreurs de réseau/temporaires (retryable)
    if (message.includes('timeout') || message.includes('connection') || message.includes('network')) {
      return { type: 'network', isRetryable: true, severity: 'medium' }
    }
    
    // Erreurs de base de données temporaires (retryable)
    if (message.includes('lock') || message.includes('deadlock') || message.includes('busy')) {
      return { type: 'database_temporary', isRetryable: true, severity: 'medium' }
    }
    
    // Erreurs de validation (non retryable)
    if (message.includes('validation') || message.includes('invalid')) {
      return { type: 'validation', isRetryable: false, severity: 'low' }
    }
    
    // Erreurs de permissions (non retryable)
    if (message.includes('permission') || message.includes('unauthorized')) {
      return { type: 'permission', isRetryable: false, severity: 'medium' }
    }
    
    // Erreurs système critiques (non retryable)
    if (message.includes('out of memory') || message.includes('disk full')) {
      return { type: 'system_critical', isRetryable: false, severity: 'high' }
    }
    
    // Erreur générique (retryable par défaut)
    return { type: 'generic', isRetryable: true, severity: 'medium' }
  }

  /**
   * Crée une stratégie de fallback pour les erreurs techniques
   */
  private async createTechnicalErrorFallback(
    errorAnalysis: any,
    context: string
  ): Promise<{
    canRecover: boolean
    message: string
    redirectUrl?: string
    reason: string
    supportTicketId?: string
  }> {
    // Créer un ticket de support automatique pour les erreurs critiques
    let supportTicketId: string | undefined

    if (errorAnalysis.severity === 'high') {
      try {
        // Check if auditLogs collection exists
        const collections = this.payload.config.collections
        const hasAuditLogs = collections.some((col: any) => col.slug === 'auditLogs')
        
        if (hasAuditLogs) {
          const ticket = await this.payload.create({
            collection: 'auditLogs' as any,
            data: {
              action: 'technical_error_critical',
              details: {
                errorType: errorAnalysis.type,
                context,
                severity: errorAnalysis.severity,
                timestamp: new Date().toISOString(),
                requiresAttention: true
              }
            } as any
          })
          supportTicketId = String(ticket.id)
        }
      } catch (e) {
        // Ignore si on ne peut pas créer le ticket
      }
    }

    return {
      canRecover: errorAnalysis.severity !== 'high',
      message: errorAnalysis.severity === 'high' 
        ? 'Erreur système critique détectée. Notre équipe technique a été notifiée.'
        : 'Erreur technique temporaire. Veuillez réessayer plus tard.',
      redirectUrl: errorAnalysis.severity === 'high' ? '/support' : '/student/dashboard',
      reason: `Erreur ${errorAnalysis.type} de sévérité ${errorAnalysis.severity}`,
      supportTicketId
    }
  }

  /**
   * Calcule le temps d'attente pour les limites de taux
   */
  private async calculateWaitTime(
    userId: string,
    limitType: 'daily' | 'cooldown'
  ): Promise<{
    secondsUntilReset: number
    currentUsage?: number
    maxUsage?: number
    resetTime?: string
    lastActionTime?: string
  }> {
    if (limitType === 'daily') {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const todaySessions = await this.payload.find({
        collection: 'adaptiveQuizSessions',
        where: {
          and: [
            { user: { equals: userId } },
            { createdAt: { greater_than: today } }
          ]
        }
      })

      return {
        secondsUntilReset: Math.floor((tomorrow.getTime() - Date.now()) / 1000),
        currentUsage: todaySessions.totalDocs,
        maxUsage: 5,
        resetTime: tomorrow.toISOString()
      }
    } else {
      const lastSession = await this.payload.find({
        collection: 'adaptiveQuizSessions' as any,
        where: { user: { equals: userId } },
        sort: '-createdAt',
        limit: 1
      })

      if (lastSession.totalDocs === 0) {
        return { secondsUntilReset: 0 }
      }

      const lastSessionDoc = lastSession.docs[0] as any
      const lastSessionTime = new Date(lastSessionDoc?.createdAt || Date.now())
      const cooldownEnd = new Date(lastSessionTime.getTime() + 30 * 60 * 1000) // 30 minutes
      const now = new Date()

      return {
        secondsUntilReset: Math.max(0, Math.floor((cooldownEnd.getTime() - now.getTime()) / 1000)),
        lastActionTime: lastSessionTime.toISOString()
      }
    }
  }

  /**
   * Génère des suggestions pour les limites de taux
   */
  private generateRateLimitSuggestions(
    limitType: 'daily' | 'cooldown',
    waitTime: any
  ): UserActionSuggestion[] {
    if (limitType === 'daily') {
      return [
        {
          title: 'Quiz réguliers',
          description: 'Continuez à vous entraîner avec les quiz classiques',
          actionType: 'take_quiz',
          actionUrl: '/student/quizzes',
          priority: 'high',
          estimatedTimeMinutes: 15
        },
        {
          title: 'Révision des résultats',
          description: 'Analysez vos performances précédentes',
          actionType: 'navigate',
          actionUrl: '/student/results',
          priority: 'medium',
          estimatedTimeMinutes: 10
        }
      ]
    } else {
      return [
        {
          title: 'Révision ciblée',
          description: 'Profitez de cette pause pour réviser vos points faibles',
          actionType: 'navigate',
          actionUrl: '/student/study-materials',
          priority: 'high',
          estimatedTimeMinutes: waitTime.remainingMinutes || 30
        }
      ]
    }
  }

  /**
   * Crée une stratégie de récupération de fallback générique
   */
  private createFallbackRecovery(message: string): RecoveryStrategy {
    return {
      canRecover: false,
      action: 'fallback',
      message,
      details: {
        fallbackReason: 'Erreur lors de l\'analyse de récupération',
        timestamp: new Date().toISOString()
      }
    }
  }
}