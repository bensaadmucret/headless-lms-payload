import type { Payload } from 'payload'
import { getRateLimitInfo } from '../hooks/rateLimitHook'

export interface RateLimitStatus {
  canGenerate: boolean
  reason?: string
  dailyCount: number
  dailyLimit: number
  remainingCooldownMinutes?: number
  hoursUntilReset?: number
  nextAvailableAt?: Date
}

/**
 * Service de gestion des limitations de taux pour les quiz adaptatifs
 */
export class RateLimitService {
  constructor(private payload: Payload) {}

  /**
   * Vérifie si un utilisateur peut générer un nouveau quiz adaptatif
   */
  async checkRateLimit(userId: string): Promise<RateLimitStatus> {
    const rateLimitInfo = await getRateLimitInfo(this.payload, userId)

    if (rateLimitInfo.dailyLimitReached) {
      const nextAvailableAt = new Date()
      nextAvailableAt.setDate(nextAvailableAt.getDate() + 1)
      nextAvailableAt.setHours(0, 0, 0, 0)

      return {
        canGenerate: false,
        reason: 'daily_limit_exceeded',
        dailyCount: rateLimitInfo.dailyCount,
        dailyLimit: rateLimitInfo.dailyLimit,
        hoursUntilReset: rateLimitInfo.hoursUntilReset,
        nextAvailableAt
      }
    }

    if (rateLimitInfo.cooldownActive) {
      const nextAvailableAt = new Date()
      nextAvailableAt.setMinutes(nextAvailableAt.getMinutes() + rateLimitInfo.remainingCooldownMinutes)

      return {
        canGenerate: false,
        reason: 'cooldown_active',
        dailyCount: rateLimitInfo.dailyCount,
        dailyLimit: rateLimitInfo.dailyLimit,
        remainingCooldownMinutes: rateLimitInfo.remainingCooldownMinutes,
        nextAvailableAt
      }
    }

    return {
      canGenerate: true,
      dailyCount: rateLimitInfo.dailyCount,
      dailyLimit: rateLimitInfo.dailyLimit
    }
  }

  /**
   * Génère un message d'erreur informatif pour les limitations de taux
   */
  getRateLimitErrorMessage(status: RateLimitStatus): string {
    if (status.reason === 'daily_limit_exceeded') {
      const hours = status.hoursUntilReset || 0
      return `Vous avez atteint la limite quotidienne de ${status.dailyLimit} quiz adaptatifs. Vous pourrez générer un nouveau quiz dans ${hours} heure${hours > 1 ? 's' : ''}.`
    }

    if (status.reason === 'cooldown_active') {
      const minutes = status.remainingCooldownMinutes || 0
      return `Vous devez attendre ${minutes} minute${minutes > 1 ? 's' : ''} avant de pouvoir générer un nouveau quiz adaptatif.`
    }

    return 'Limitation de taux inconnue'
  }

  /**
   * Obtient les statistiques d'utilisation pour un utilisateur
   */
  async getUserUsageStats(userId: string) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thisWeek = new Date(today)
    thisWeek.setDate(thisWeek.getDate() - 7)

    const thisMonth = new Date(today)
    thisMonth.setMonth(thisMonth.getMonth() - 1)

    // Sessions d'aujourd'hui
    const todaySessions = await this.payload.find({
      collection: 'adaptiveQuizSessions',
      where: {
        and: [
          { user: { equals: userId } },
          { createdAt: { greater_than: today } }
        ]
      }
    })

    // Sessions de cette semaine
    const weekSessions = await this.payload.find({
      collection: 'adaptiveQuizSessions',
      where: {
        and: [
          { user: { equals: userId } },
          { createdAt: { greater_than: thisWeek } }
        ]
      }
    })

    // Sessions de ce mois
    const monthSessions = await this.payload.find({
      collection: 'adaptiveQuizSessions',
      where: {
        and: [
          { user: { equals: userId } },
          { createdAt: { greater_than: thisMonth } }
        ]
      }
    })

    return {
      today: todaySessions.totalDocs,
      thisWeek: weekSessions.totalDocs,
      thisMonth: monthSessions.totalDocs,
      dailyLimit: 5,
      weeklyAverage: Math.round(weekSessions.totalDocs / 7 * 10) / 10,
      monthlyAverage: Math.round(monthSessions.totalDocs / 30 * 10) / 10
    }
  }
}