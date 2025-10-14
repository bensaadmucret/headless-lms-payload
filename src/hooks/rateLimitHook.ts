import type { CollectionBeforeChangeHook } from 'payload'
import type { Payload } from 'payload'

/**
 * Hook de limitation de taux pour les quiz adaptatifs
 * Vérifie les limites quotidiennes (5 quiz/jour) et le cooldown (30 minutes)
 */
export const rateLimitHook: CollectionBeforeChangeHook = async ({ req, data, operation, collection }) => {
  if (operation === 'create' && collection?.slug === 'adaptiveQuizSessions') {
    const userId = data.user || req.user?.id

    if (!userId) {
      throw new Error('User ID is required for rate limiting')
    }

    // Vérifications de limite de taux
    await checkDailyLimit(req.payload, userId)
    await checkCooldown(req.payload, userId)
  }
}

/**
 * Vérifie la limite quotidienne de 5 quiz adaptatifs par jour
 */
export async function checkDailyLimit(payload: Payload, userId: string): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todaySessions = await payload.find({
    collection: 'adaptiveQuizSessions',
    where: {
      and: [
        { user: { equals: userId } },
        { createdAt: { greater_than: today } }
      ]
    }
  })

  if (todaySessions.totalDocs >= 5) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const hoursUntilReset = Math.ceil((tomorrow.getTime() - Date.now()) / (1000 * 60 * 60))

    throw new Error(`daily_limit_exceeded:${hoursUntilReset}`)
  }
}

/**
 * Vérifie le cooldown de 30 minutes entre les générations de quiz
 */
export async function checkCooldown(payload: Payload, userId: string): Promise<void> {
  const lastSession = await payload.find({
    collection: 'adaptiveQuizSessions',
    where: { user: { equals: userId } },
    sort: '-createdAt',
    limit: 1
  })

  if (lastSession.totalDocs > 0 && lastSession.docs[0]) {
    const lastSessionTime = new Date(lastSession.docs[0].createdAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60)

    if (diffMinutes < 30) {
      const remainingMinutes = Math.ceil(30 - diffMinutes)
      throw new Error(`cooldown_active:${remainingMinutes}`)
    }
  }
}

/**
 * Obtient les informations de limite de taux pour un utilisateur
 */
export async function getRateLimitInfo(payload: Payload, userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Compter les sessions d'aujourd'hui
  const todaySessions = await payload.find({
    collection: 'adaptiveQuizSessions',
    where: {
      and: [
        { user: { equals: userId } },
        { createdAt: { greater_than: today } }
      ]
    },
    sort: '-createdAt'
  })

  const dailyCount = todaySessions.totalDocs
  const dailyLimitReached = dailyCount >= 5

  // Vérifier le cooldown
  let cooldownActive = false
  let remainingCooldownMinutes = 0

  if (todaySessions.totalDocs > 0 && todaySessions.docs[0]) {
    const lastSessionTime = new Date(todaySessions.docs[0].createdAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - lastSessionTime.getTime()) / (1000 * 60)

    if (diffMinutes < 30) {
      cooldownActive = true
      remainingCooldownMinutes = Math.ceil(30 - diffMinutes)
    }
  }

  // Calculer les heures jusqu'à la réinitialisation quotidienne
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const hoursUntilReset = Math.ceil((tomorrow.getTime() - Date.now()) / (1000 * 60 * 60))

  return {
    dailyCount,
    dailyLimit: 5,
    dailyLimitReached,
    cooldownActive,
    remainingCooldownMinutes,
    hoursUntilReset,
    canGenerate: !dailyLimitReached && !cooldownActive
  }
}

/**
 * Réinitialise automatiquement les compteurs à minuit (fonction utilitaire)
 * Cette fonction peut être appelée par un cron job ou un scheduler
 */
export async function resetDailyCounters(_payload: Payload): Promise<void> {
  // Cette fonction est principalement documentaire car la réinitialisation
  // se fait automatiquement par la logique de checkDailyLimit qui utilise
  // la date du jour comme filtre

  // Log pour le monitoring
  console.log(`[${new Date().toISOString()}] Daily rate limit counters reset automatically`)
}