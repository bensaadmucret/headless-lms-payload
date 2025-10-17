/**
 * Service de limitation de taux spécialisé pour la génération de quiz IA
 * Implémente la tâche 8: Gestion des erreurs API IA (rate limiting, indisponibilité)
 */

import type { Payload } from 'payload'

export interface RateLimitConfig {
  maxRequestsPerHour: number
  maxRequestsPerDay: number
  cooldownMinutes: number
  burstLimit: number
  burstWindowMinutes: number
}

export interface RateLimitStatus {
  allowed: boolean
  reason?: string
  remainingRequests: {
    hourly: number
    daily: number
    burst: number
  }
  resetTimes: {
    hourly: Date
    daily: Date
    burst?: Date
  }
  waitTimeSeconds?: number
  nextAvailableAt?: Date
}

export interface UserRateLimitInfo {
  userId: string
  hourlyCount: number
  dailyCount: number
  burstCount: number
  lastRequestTime: Date
  lastResetTime: Date
  isBlocked: boolean
  blockUntil?: Date
}

/**
 * Service de limitation de taux avancé pour les requêtes IA
 */
export class AIQuizRateLimitService {
  private rateLimitCache: Map<string, UserRateLimitInfo> = new Map()
  private globalStats: Map<string, number> = new Map()
  
  // Configuration par défaut
  private readonly DEFAULT_CONFIG: RateLimitConfig = {
    maxRequestsPerHour: 10,
    maxRequestsPerDay: 50,
    cooldownMinutes: 5,
    burstLimit: 3,
    burstWindowMinutes: 10
  }

  // Configuration par rôle utilisateur
  private readonly ROLE_CONFIGS: Record<string, RateLimitConfig> = {
    admin: {
      maxRequestsPerHour: 50,
      maxRequestsPerDay: 200,
      cooldownMinutes: 2,
      burstLimit: 10,
      burstWindowMinutes: 5
    },
    teacher: {
      maxRequestsPerHour: 20,
      maxRequestsPerDay: 100,
      cooldownMinutes: 3,
      burstLimit: 5,
      burstWindowMinutes: 10
    },
    student: {
      maxRequestsPerHour: 5,
      maxRequestsPerDay: 20,
      cooldownMinutes: 10,
      burstLimit: 2,
      burstWindowMinutes: 15
    }
  }

  constructor(private payload: Payload) {
    // Nettoyer le cache périodiquement
    setInterval(() => this.cleanupCache(), 60000) // Toutes les minutes
  }

  /**
   * Vérifie si un utilisateur peut effectuer une requête
   */
  async checkRateLimit(userId: string, operation: string = 'generation'): Promise<RateLimitStatus> {
    try {
      // Obtenir la configuration pour cet utilisateur
      const config = await this.getUserRateLimitConfig(userId)
      
      // Obtenir ou créer les informations de rate limit
      const userInfo = await this.getUserRateLimitInfo(userId)
      
      // Vérifier les différentes limites
      const hourlyCheck = this.checkHourlyLimit(userInfo, config)
      const dailyCheck = this.checkDailyLimit(userInfo, config)
      const burstCheck = this.checkBurstLimit(userInfo, config)
      const cooldownCheck = this.checkCooldown(userInfo, config)
      
      // Déterminer le statut global
      const checks = [hourlyCheck, dailyCheck, burstCheck, cooldownCheck]
      const failedCheck = checks.find(check => !check.allowed)
      
      if (failedCheck) {
        // Enregistrer la tentative bloquée
        await this.recordBlockedAttempt(userId, operation, failedCheck.reason || 'Rate limit exceeded')
        
        return failedCheck
      }

      // Toutes les vérifications passent - autoriser la requête
      await this.recordAllowedRequest(userId, operation)
      
      return {
        allowed: true,
        remainingRequests: {
          hourly: Math.max(0, config.maxRequestsPerHour - userInfo.hourlyCount - 1),
          daily: Math.max(0, config.maxRequestsPerDay - userInfo.dailyCount - 1),
          burst: Math.max(0, config.burstLimit - userInfo.burstCount - 1)
        },
        resetTimes: {
          hourly: this.getNextHourReset(),
          daily: this.getNextDayReset(),
          burst: userInfo.burstCount > 0 ? this.getNextBurstReset(userInfo, config) : undefined
        }
      }

    } catch (error) {
      console.error('Erreur lors de la vérification du rate limit:', error)
      
      // En cas d'erreur, être conservateur et bloquer
      return {
        allowed: false,
        reason: 'Erreur système lors de la vérification des limites',
        remainingRequests: { hourly: 0, daily: 0, burst: 0 },
        resetTimes: {
          hourly: this.getNextHourReset(),
          daily: this.getNextDayReset()
        }
      }
    }
  }

  /**
   * Enregistre une requête autorisée
   */
  private async recordAllowedRequest(userId: string, operation: string): Promise<void> {
    const userInfo = this.rateLimitCache.get(userId)
    if (!userInfo) return

    const now = new Date()
    
    // Mettre à jour les compteurs
    userInfo.hourlyCount++
    userInfo.dailyCount++
    userInfo.burstCount++
    userInfo.lastRequestTime = now

    // Sauvegarder en cache
    this.rateLimitCache.set(userId, userInfo)

    // Enregistrer dans les logs si nécessaire
    try {
      const collections = this.payload.config.collections
      const hasAuditLogs = collections.some((col: any) => col.slug === 'auditLogs')
      
      if (hasAuditLogs) {
        await this.payload.create({
          collection: 'auditLogs' as any,
          data: {
            action: 'ai_request_allowed',
            user: { relationTo: 'users', value: userId },
            details: {
              operation,
              hourlyCount: userInfo.hourlyCount,
              dailyCount: userInfo.dailyCount,
              burstCount: userInfo.burstCount,
              timestamp: now.toISOString()
            },
            severity: 'low'
          } as any
        })
      }
    } catch (logError) {
      console.warn('Erreur lors de l\'enregistrement de la requête autorisée:', logError)
    }
  }

  /**
   * Enregistre une tentative bloquée
   */
  private async recordBlockedAttempt(userId: string, operation: string, reason: string): Promise<void> {
    try {
      const collections = this.payload.config.collections
      const hasAuditLogs = collections.some((col: any) => col.slug === 'auditLogs')
      
      if (hasAuditLogs) {
        await this.payload.create({
          collection: 'auditLogs' as any,
          data: {
            action: 'ai_request_blocked',
            user: { relationTo: 'users', value: userId },
            details: {
              operation,
              reason,
              timestamp: new Date().toISOString()
            },
            severity: 'medium'
          } as any
        })
      }

      // Mettre à jour les statistiques globales
      const blockKey = `blocked_${reason.replace(/\s+/g, '_')}`
      const currentCount = this.globalStats.get(blockKey) || 0
      this.globalStats.set(blockKey, currentCount + 1)

    } catch (logError) {
      console.warn('Erreur lors de l\'enregistrement de la tentative bloquée:', logError)
    }
  }

  /**
   * Obtient la configuration de rate limit pour un utilisateur
   */
  private async getUserRateLimitConfig(userId: string): Promise<RateLimitConfig> {
    try {
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId
      })

      const userRole = (user as any)?.role || 'student'
      return this.ROLE_CONFIGS[userRole] || this.DEFAULT_CONFIG

    } catch (error) {
      console.warn('Erreur lors de la récupération du rôle utilisateur:', error)
      return this.DEFAULT_CONFIG
    }
  }

  /**
   * Obtient ou crée les informations de rate limit pour un utilisateur
   */
  private async getUserRateLimitInfo(userId: string): Promise<UserRateLimitInfo> {
    const cached = this.rateLimitCache.get(userId)
    const now = new Date()

    if (cached) {
      // Réinitialiser les compteurs si nécessaire
      const hoursSinceLastReset = (now.getTime() - cached.lastResetTime.getTime()) / (1000 * 60 * 60)
      
      if (hoursSinceLastReset >= 24) {
        // Réinitialiser les compteurs quotidiens et horaires
        cached.dailyCount = 0
        cached.hourlyCount = 0
        cached.burstCount = 0
        cached.lastResetTime = now
      } else if (hoursSinceLastReset >= 1) {
        // Réinitialiser seulement les compteurs horaires
        cached.hourlyCount = 0
        cached.burstCount = 0
      }

      return cached
    }

    // Créer de nouvelles informations
    const newInfo: UserRateLimitInfo = {
      userId,
      hourlyCount: 0,
      dailyCount: 0,
      burstCount: 0,
      lastRequestTime: new Date(0),
      lastResetTime: now,
      isBlocked: false
    }

    this.rateLimitCache.set(userId, newInfo)
    return newInfo
  }

  /**
   * Vérifie la limite horaire
   */
  private checkHourlyLimit(userInfo: UserRateLimitInfo, config: RateLimitConfig): RateLimitStatus {
    if (userInfo.hourlyCount >= config.maxRequestsPerHour) {
      const nextReset = this.getNextHourReset()
      const waitTimeSeconds = Math.ceil((nextReset.getTime() - Date.now()) / 1000)

      return {
        allowed: false,
        reason: `Limite horaire atteinte (${config.maxRequestsPerHour} requêtes/heure)`,
        remainingRequests: { hourly: 0, daily: 0, burst: 0 },
        resetTimes: { hourly: nextReset, daily: this.getNextDayReset() },
        waitTimeSeconds,
        nextAvailableAt: nextReset
      }
    }

    return {
      allowed: true,
      remainingRequests: { hourly: 0, daily: 0, burst: 0 },
      resetTimes: { hourly: this.getNextHourReset(), daily: this.getNextDayReset() }
    }
  }

  /**
   * Vérifie la limite quotidienne
   */
  private checkDailyLimit(userInfo: UserRateLimitInfo, config: RateLimitConfig): RateLimitStatus {
    if (userInfo.dailyCount >= config.maxRequestsPerDay) {
      const nextReset = this.getNextDayReset()
      const waitTimeSeconds = Math.ceil((nextReset.getTime() - Date.now()) / 1000)

      return {
        allowed: false,
        reason: `Limite quotidienne atteinte (${config.maxRequestsPerDay} requêtes/jour)`,
        remainingRequests: { hourly: 0, daily: 0, burst: 0 },
        resetTimes: { hourly: this.getNextHourReset(), daily: nextReset },
        waitTimeSeconds,
        nextAvailableAt: nextReset
      }
    }

    return {
      allowed: true,
      remainingRequests: { hourly: 0, daily: 0, burst: 0 },
      resetTimes: { hourly: this.getNextHourReset(), daily: this.getNextDayReset() }
    }
  }

  /**
   * Vérifie la limite de burst
   */
  private checkBurstLimit(userInfo: UserRateLimitInfo, config: RateLimitConfig): RateLimitStatus {
    const now = new Date()
    const burstWindowMs = config.burstWindowMinutes * 60 * 1000
    const timeSinceLastRequest = now.getTime() - userInfo.lastRequestTime.getTime()

    // Réinitialiser le compteur de burst si la fenêtre est expirée
    if (timeSinceLastRequest > burstWindowMs) {
      userInfo.burstCount = 0
    }

    if (userInfo.burstCount >= config.burstLimit) {
      const nextReset = new Date(userInfo.lastRequestTime.getTime() + burstWindowMs)
      const waitTimeSeconds = Math.ceil((nextReset.getTime() - now.getTime()) / 1000)

      return {
        allowed: false,
        reason: `Limite de burst atteinte (${config.burstLimit} requêtes en ${config.burstWindowMinutes} minutes)`,
        remainingRequests: { hourly: 0, daily: 0, burst: 0 },
        resetTimes: { 
          hourly: this.getNextHourReset(), 
          daily: this.getNextDayReset(),
          burst: nextReset
        },
        waitTimeSeconds,
        nextAvailableAt: nextReset
      }
    }

    return {
      allowed: true,
      remainingRequests: { hourly: 0, daily: 0, burst: 0 },
      resetTimes: { hourly: this.getNextHourReset(), daily: this.getNextDayReset() }
    }
  }

  /**
   * Vérifie le cooldown entre les requêtes
   */
  private checkCooldown(userInfo: UserRateLimitInfo, config: RateLimitConfig): RateLimitStatus {
    const now = new Date()
    const cooldownMs = config.cooldownMinutes * 60 * 1000
    const timeSinceLastRequest = now.getTime() - userInfo.lastRequestTime.getTime()

    if (timeSinceLastRequest < cooldownMs) {
      const nextAvailable = new Date(userInfo.lastRequestTime.getTime() + cooldownMs)
      const waitTimeSeconds = Math.ceil((nextAvailable.getTime() - now.getTime()) / 1000)

      return {
        allowed: false,
        reason: `Cooldown actif (${config.cooldownMinutes} minutes entre les requêtes)`,
        remainingRequests: { hourly: 0, daily: 0, burst: 0 },
        resetTimes: { hourly: this.getNextHourReset(), daily: this.getNextDayReset() },
        waitTimeSeconds,
        nextAvailableAt: nextAvailable
      }
    }

    return {
      allowed: true,
      remainingRequests: { hourly: 0, daily: 0, burst: 0 },
      resetTimes: { hourly: this.getNextHourReset(), daily: this.getNextDayReset() }
    }
  }

  /**
   * Obtient le prochain reset horaire
   */
  private getNextHourReset(): Date {
    const now = new Date()
    const nextHour = new Date(now)
    nextHour.setHours(now.getHours() + 1, 0, 0, 0)
    return nextHour
  }

  /**
   * Obtient le prochain reset quotidien
   */
  private getNextDayReset(): Date {
    const now = new Date()
    const nextDay = new Date(now)
    nextDay.setDate(now.getDate() + 1)
    nextDay.setHours(0, 0, 0, 0)
    return nextDay
  }

  /**
   * Obtient le prochain reset de burst
   */
  private getNextBurstReset(userInfo: UserRateLimitInfo, config: RateLimitConfig): Date {
    const burstWindowMs = config.burstWindowMinutes * 60 * 1000
    return new Date(userInfo.lastRequestTime.getTime() + burstWindowMs)
  }

  /**
   * Nettoie le cache des entrées expirées
   */
  private cleanupCache(): void {
    const now = new Date()
    const maxAge = 24 * 60 * 60 * 1000 // 24 heures

    for (const [userId, userInfo] of this.rateLimitCache.entries()) {
      const age = now.getTime() - userInfo.lastResetTime.getTime()
      
      if (age > maxAge && userInfo.lastRequestTime.getTime() < now.getTime() - maxAge) {
        this.rateLimitCache.delete(userId)
      }
    }
  }

  /**
   * Obtient les statistiques globales de rate limiting
   */
  getGlobalStats(): {
    totalUsers: number
    activeUsers: number
    blockedAttempts: Record<string, number>
    cacheSize: number
  } {
    const now = new Date()
    const activeThreshold = 60 * 60 * 1000 // 1 heure

    let activeUsers = 0
    for (const userInfo of this.rateLimitCache.values()) {
      if (now.getTime() - userInfo.lastRequestTime.getTime() < activeThreshold) {
        activeUsers++
      }
    }

    const blockedAttempts: Record<string, number> = {}
    for (const [key, value] of this.globalStats.entries()) {
      if (key.startsWith('blocked_')) {
        blockedAttempts[key.replace('blocked_', '')] = value
      }
    }

    return {
      totalUsers: this.rateLimitCache.size,
      activeUsers,
      blockedAttempts,
      cacheSize: this.rateLimitCache.size
    }
  }

  /**
   * Obtient les statistiques pour un utilisateur spécifique
   */
  async getUserStats(userId: string): Promise<{
    currentLimits: RateLimitConfig
    usage: {
      hourly: number
      daily: number
      burst: number
    }
    remaining: {
      hourly: number
      daily: number
      burst: number
    }
    nextResets: {
      hourly: Date
      daily: Date
      burst?: Date
    }
    isBlocked: boolean
    blockReason?: string
  }> {
    const config = await this.getUserRateLimitConfig(userId)
    const userInfo = await this.getUserRateLimitInfo(userId)

    return {
      currentLimits: config,
      usage: {
        hourly: userInfo.hourlyCount,
        daily: userInfo.dailyCount,
        burst: userInfo.burstCount
      },
      remaining: {
        hourly: Math.max(0, config.maxRequestsPerHour - userInfo.hourlyCount),
        daily: Math.max(0, config.maxRequestsPerDay - userInfo.dailyCount),
        burst: Math.max(0, config.burstLimit - userInfo.burstCount)
      },
      nextResets: {
        hourly: this.getNextHourReset(),
        daily: this.getNextDayReset(),
        burst: userInfo.burstCount > 0 ? this.getNextBurstReset(userInfo, config) : undefined
      },
      isBlocked: userInfo.isBlocked,
      blockReason: userInfo.blockUntil ? 'Temporairement bloqué' : undefined
    }
  }

  /**
   * Réinitialise les limites pour un utilisateur (admin uniquement)
   */
  async resetUserLimits(userId: string, adminUserId: string): Promise<boolean> {
    try {
      // Vérifier que l'admin a les permissions
      const admin = await this.payload.findByID({
        collection: 'users',
        id: adminUserId
      })

      if ((admin as any)?.role !== 'admin') {
        throw new Error('Permissions insuffisantes')
      }

      // Réinitialiser les limites
      const userInfo = this.rateLimitCache.get(userId)
      if (userInfo) {
        userInfo.hourlyCount = 0
        userInfo.dailyCount = 0
        userInfo.burstCount = 0
        userInfo.isBlocked = false
        userInfo.blockUntil = undefined
        userInfo.lastResetTime = new Date()
        
        this.rateLimitCache.set(userId, userInfo)
      }

      // Logger l'action
      const collections = this.payload.config.collections
      const hasAuditLogs = collections.some((col: any) => col.slug === 'auditLogs')
      
      if (hasAuditLogs) {
        await this.payload.create({
          collection: 'auditLogs' as any,
          data: {
            action: 'rate_limit_reset',
            user: { relationTo: 'users', value: adminUserId },
            details: {
              targetUserId: userId,
              timestamp: new Date().toISOString()
            },
            severity: 'medium'
          } as any
        })
      }

      return true

    } catch (error) {
      console.error('Erreur lors de la réinitialisation des limites:', error)
      return false
    }
  }

  /**
   * Génère un message d'erreur informatif pour le rate limiting
   */
  generateRateLimitMessage(status: RateLimitStatus): string {
    if (status.allowed) {
      return 'Requête autorisée'
    }

    const waitTime = status.waitTimeSeconds || 0
    const waitMinutes = Math.ceil(waitTime / 60)
    const waitHours = Math.ceil(waitTime / 3600)

    let timeMessage = ''
    if (waitTime < 60) {
      timeMessage = `${waitTime} seconde${waitTime > 1 ? 's' : ''}`
    } else if (waitTime < 3600) {
      timeMessage = `${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}`
    } else {
      timeMessage = `${waitHours} heure${waitHours > 1 ? 's' : ''}`
    }

    return `${status.reason}. Veuillez attendre ${timeMessage} avant de réessayer.`
  }
}