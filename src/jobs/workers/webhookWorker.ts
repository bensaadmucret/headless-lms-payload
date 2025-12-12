/**
 * Worker pour le traitement des tâches webhook Stripe
 * - Traite la queue de retry des webhooks toutes les 5 minutes
 * - Nettoie les anciennes entrées tous les jours à 2h du matin
 */

import { getPayloadInstance } from '../initPayload'
import { webhookQueue } from '../queue'
import { processWebhookRetryQueue } from '../processWebhookRetryQueue'
import { cleanupWebhookRetryQueue } from '../cleanupWebhookRetryQueue'
import { cleanupProspects } from '../cleanupProspects'

/**
 * Démarre le worker pour les tâches webhook
 */
export function startWebhookWorker() {
  console.log('🔄 Starting webhook worker...')

  // Traiter les jobs de la queue
  webhookQueue.process('process-retry-queue', async (_job) => {
    console.log('[Webhook Worker] Processing retry queue...')
    const payload = await getPayloadInstance()
    await processWebhookRetryQueue(payload)
    return { success: true, timestamp: new Date().toISOString() }
  })

  webhookQueue.process('cleanup-retry-queue', async (_job) => {
    console.log('[Webhook Worker] Cleaning up old entries...')
    const payload = await getPayloadInstance()
    await cleanupWebhookRetryQueue(payload)
    return { success: true, timestamp: new Date().toISOString() }
  })

  webhookQueue.process('cleanup-prospects', async (_job) => {
    console.log('[Webhook Worker] Cleaning up old pending prospects...')
    const payload = await getPayloadInstance()
    await cleanupProspects(payload)
    return { success: true, timestamp: new Date().toISOString() }
  })

  // Configurer les jobs répétitifs
  setupRepeatableJobs()

  console.log('✅ Webhook worker started')
}

/**
 * Configure les jobs répétitifs (équivalent cron)
 */
async function setupRepeatableJobs() {
  try {
    // Nettoyer les anciens jobs répétitifs (au cas où)
    const repeatableJobs = await webhookQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      await webhookQueue.removeRepeatableByKey(job.key)
    }

    // Job 1: Traiter la queue de retry toutes les 5 minutes
    await webhookQueue.add(
      'process-retry-queue',
      {},
      {
        repeat: {
          cron: '*/5 * * * *', // Toutes les 5 minutes
        },
        jobId: 'process-webhook-retry-queue',
      }
    )
    console.log('📅 Scheduled: process-retry-queue (every 5 minutes)')

    // Job 2: Nettoyer les anciennes entrées tous les jours à 2h
    await webhookQueue.add(
      'cleanup-retry-queue',
      {},
      {
        repeat: {
          cron: '0 2 * * *', // Tous les jours à 2h
        },
        jobId: 'cleanup-webhook-retry-queue',
      }
    )
    console.log('📅 Scheduled: cleanup-retry-queue (daily at 2 AM)')

    // Job 3: Nettoyer les prospects pending expirés tous les jours à 3h
    await webhookQueue.add(
      'cleanup-prospects',
      {},
      {
        repeat: {
          cron: '0 3 * * *', // Tous les jours à 3h
        },
        jobId: 'cleanup-prospects',
      }
    )
    console.log('📅 Scheduled: cleanup-prospects (daily at 3 AM)')
  } catch (error) {
    console.error('❌ Error setting up repeatable jobs:', error)
    throw error
  }
}
