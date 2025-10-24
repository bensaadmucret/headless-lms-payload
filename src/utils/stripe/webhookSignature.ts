import Stripe from 'stripe';

/**
 * Verifies the Stripe webhook signature to ensure the webhook is authentic
 * 
 * @param body - Raw request body as string
 * @param signature - Stripe-Signature header value
 * @param webhookSecret - Webhook secret from Stripe Dashboard
 * @returns Verified Stripe event
 * @throws Error if signature verification fails
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  webhookSecret: string,
  stripe: Stripe
): Stripe.Event {
  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return event;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log security warning for failed verification
    console.error('[SECURITY] Webhook signature verification failed', {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      signatureProvided: !!signature,
    });
    
    throw new Error(`Webhook signature verification failed: ${errorMessage}`);
  }
}
