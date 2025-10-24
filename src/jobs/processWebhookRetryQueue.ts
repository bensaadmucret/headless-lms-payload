import { Payload } from 'payload';
import { getStripeClient } from '../services/stripe';
import { StripeWebhookService } from '../services/stripe/StripeWebhookService';

/**
 * Process pending webhooks in the retry queue
 * This should be run as a cron job or worker every 5 minutes
 */
export async function processWebhookRetryQueue(payload: Payload): Promise<void> {
  console.log('[Webhook Retry Queue] Starting processing', {
    timestamp: new Date().toISOString(),
  });

  try {
    // Find pending webhooks that are ready to retry
    const pendingWebhooks = await payload.find({
      collection: 'webhook-retry-queue',
      where: {
        and: [
          { status: { equals: 'pending' } },
          { nextRetryAt: { less_than_or_equal: new Date() } },
        ],
      },
      limit: 50, // Process up to 50 webhooks per run
    });

    console.log('[Webhook Retry Queue] Found pending webhooks', {
      count: pendingWebhooks.docs.length,
    });

    if (pendingWebhooks.docs.length === 0) {
      return;
    }

    // Initialize Stripe client and webhook service
    const stripeClient = getStripeClient();
    const webhookService = new StripeWebhookService(stripeClient, payload);

    // Process each webhook
    for (const webhook of pendingWebhooks.docs) {
      console.log('[Webhook Retry Queue] Processing webhook', {
        eventId: webhook.eventId,
        eventType: webhook.eventType,
        retryCount: webhook.retryCount,
      });

      try {
        // Mark as processing
        await payload.update({
          collection: 'webhook-retry-queue',
          id: webhook.id,
          data: {
            status: 'processing',
          },
        });

        // Process the event
        const result = await webhookService.processEvent(webhook.payload);

        if (result.success) {
          // Mark as success
          await payload.update({
            collection: 'webhook-retry-queue',
            id: webhook.id,
            data: {
              status: 'success',
            },
          });

          console.log('[Webhook Retry Queue] Webhook processed successfully', {
            eventId: webhook.eventId,
            eventType: webhook.eventType,
          });
        } else {
          // Increment retry count
          const newRetryCount = webhook.retryCount + 1;
          const maxRetries = webhook.maxRetries || 3;

          if (newRetryCount >= maxRetries) {
            // Mark as failed
            await payload.update({
              collection: 'webhook-retry-queue',
              id: webhook.id,
              data: {
                status: 'failed',
                retryCount: newRetryCount,
                lastError: result.error || 'Max retries reached',
              },
            });

            console.error('[Webhook Retry Queue] Webhook failed permanently', {
              eventId: webhook.eventId,
              eventType: webhook.eventType,
              retryCount: newRetryCount,
              error: result.error,
            });
          } else {
            // Schedule next retry (exponential backoff: 5min, 10min, 20min)
            const backoffMinutes = 5 * Math.pow(2, newRetryCount - 1);
            const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

            await payload.update({
              collection: 'webhook-retry-queue',
              id: webhook.id,
              data: {
                status: 'pending',
                retryCount: newRetryCount,
                lastError: result.error || 'Unknown error',
                nextRetryAt,
              },
            });

            console.log('[Webhook Retry Queue] Webhook scheduled for retry', {
              eventId: webhook.eventId,
              eventType: webhook.eventType,
              retryCount: newRetryCount,
              nextRetryAt: nextRetryAt.toISOString(),
            });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error('[Webhook Retry Queue] Error processing webhook', {
          eventId: webhook.eventId,
          error: errorMessage,
        });

        // Increment retry count
        const newRetryCount = webhook.retryCount + 1;
        const maxRetries = webhook.maxRetries || 3;

        if (newRetryCount >= maxRetries) {
          // Mark as failed
          await payload.update({
            collection: 'webhook-retry-queue',
            id: webhook.id,
            data: {
              status: 'failed',
              retryCount: newRetryCount,
              lastError: errorMessage,
            },
          });
        } else {
          // Schedule next retry
          const backoffMinutes = 5 * Math.pow(2, newRetryCount - 1);
          const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await payload.update({
            collection: 'webhook-retry-queue',
            id: webhook.id,
            data: {
              status: 'pending',
              retryCount: newRetryCount,
              lastError: errorMessage,
              nextRetryAt,
            },
          });
        }
      }
    }

    console.log('[Webhook Retry Queue] Processing completed', {
      processed: pendingWebhooks.docs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[Webhook Retry Queue] Fatal error', {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Payload job configuration for webhook retry queue processing
 * This can be registered in the payload config to run as a scheduled job
 */
export const webhookRetryQueueJob = {
  slug: 'process-webhook-retry-queue',
  interfaceName: 'ProcessWebhookRetryQueue',
  handler: async ({ payload }: { payload: Payload }) => {
    await processWebhookRetryQueue(payload);
  },
  schedule: '*/5 * * * *', // Run every 5 minutes
};
