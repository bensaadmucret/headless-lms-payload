import { PayloadRequest } from 'payload';
import { getStripeClient } from '../../services/stripe';
import { StripeWebhookService } from '../../services/stripe/StripeWebhookService';

/**
 * Webhook endpoint for Stripe events
 * POST /api/stripe/webhook
 */
export const webhookEndpoint = {
  path: '/stripe/webhook',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    const startTime = Date.now();
    
    try {
      // Get raw body as string (required for signature verification)
      const body = await req.text();
      
      // Get Stripe signature from headers
      const signature = req.headers.get('stripe-signature');
      
      if (!signature) {
        console.error('[Stripe Webhook] Missing Stripe-Signature header', {
          timestamp: new Date().toISOString(),
        });
        
        return new Response(
          JSON.stringify({ error: 'Missing Stripe-Signature header' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Initialize Stripe client and webhook service
      const stripeClient = getStripeClient();
      const webhookService = new StripeWebhookService(stripeClient, req.payload);

      // Verify signature and get event
      let event;
      try {
        event = webhookService.verifySignature(body, signature);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error('[Stripe Webhook] Signature verification failed', {
          error: errorMessage,
          timestamp: new Date().toISOString(),
        });
        
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }


      console.log('[Stripe Webhook] Received event', {
        eventId: event.id,
        eventType: event.type,
        timestamp: new Date().toISOString(),
      });

      // Process event asynchronously
      const result = await webhookService.processEvent(event);

      if (!result.success) {
        // Add to retry queue
        try {
          const existingEntry = await req.payload.find({
            collection: 'webhook-retry-queue',
            where: {
              eventId: { equals: event.id },
            },
            limit: 1,
          });

          if (existingEntry.docs.length === 0) {
            // Create new retry entry
            await req.payload.create({
              collection: 'webhook-retry-queue',
              data: {
                eventId: event.id,
                eventType: event.type,
                payload: event,
                retryCount: 0,
                maxRetries: 3,
                lastError: result.error || 'Unknown error',
                status: 'pending',
                nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
              },
            });

            console.log('[Stripe Webhook] Event added to retry queue', {
              eventId: event.id,
              eventType: event.type,
            });
          }
        } catch (queueError) {
          console.error('[Stripe Webhook] Failed to add to retry queue', {
            eventId: event.id,
            error: queueError instanceof Error ? queueError.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;
      console.log('[Stripe Webhook] Request completed', {
        eventId: event.id,
        eventType: event.type,
        success: result.success,
        duration: `${duration}ms`,
      });

      // Always return 200 to Stripe to acknowledge receipt
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Stripe Webhook] Unexpected error', {
        error: errorMessage,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });

      // Return 500 for unexpected errors
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
