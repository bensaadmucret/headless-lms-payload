/**
 * Task handlers pour les webhooks Stripe
 * Note: Ces handlers ne sont plus utilisés directement.
 * Les tâches sont maintenant gérées par Bull/BullMQ via webhookWorker.ts
 */

import { getPayloadInstance } from './initPayload'
import { processWebhookRetryQueue } from './processWebhookRetryQueue'
import { cleanupWebhookRetryQueue } from './cleanupWebhookRetryQueue'

export const processWebhookRetryQueueHandler = async () => {
  const payload = await getPayloadInstance()
  await processWebhookRetryQueue(payload)
}

export const cleanupWebhookRetryQueueHandler = async () => {
  const payload = await getPayloadInstance()
  await cleanupWebhookRetryQueue(payload)
}
