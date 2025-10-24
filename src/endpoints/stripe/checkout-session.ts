import type { PayloadRequest } from 'payload';
import { getStripeClient } from '../../services/stripe/startup';
import { StripeCheckoutService } from '../../services/stripe/StripeCheckoutService';
import { loadStripeConfig } from '../../services/stripe/config';

/**
 * POST /api/stripe/checkout-session
 * Creates a Stripe Checkout session for subscription
 */
export const createCheckoutSessionEndpoint = {
  path: '/stripe/checkout-session',
  method: 'post' as const,
  handler: async (req: PayloadRequest) => {
    try {
      // Verify user authentication
      if (!req.user || !req.user.id) {
        return Response.json(
          {
            error: 'Unauthorized',
            message: 'Vous devez être connecté pour créer une session de paiement',
          },
          { status: 401 }
        );
      }

      // Parse request body
      if (typeof req.json !== 'function') {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'Invalid request format',
          },
          { status: 400 }
        );
      }

      const body = await req.json();
      const { priceId } = body as { priceId?: string };

      if (!priceId) {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'Le paramètre priceId est requis',
          },
          { status: 400 }
        );
      }

      // Map priceId to actual Stripe Price ID
      const config = loadStripeConfig();
      let stripePriceId: string;

      if (priceId === 'monthly') {
        stripePriceId = config.priceIdMonthly;
      } else if (priceId === 'yearly') {
        stripePriceId = config.priceIdYearly;
      } else {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'priceId invalide. Utilisez "monthly" ou "yearly"',
          },
          { status: 400 }
        );
      }

      // Build success and cancel URLs
      const successUrl = `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${config.frontendUrl}/checkout/cancel`;

      // Create checkout session
      const stripeClient = getStripeClient();
      const checkoutService = new StripeCheckoutService(stripeClient, req.payload);

      const session = await checkoutService.createCheckoutSession({
        userId: req.user.id.toString(),
        priceId: stripePriceId,
        email: req.user.email,
        successUrl,
        cancelUrl,
      });

      console.log('Checkout session created successfully:', {
        sessionId: session.sessionId,
        userId: req.user.id,
        priceId,
      });

      return Response.json({
        sessionId: session.sessionId,
        url: session.url,
      });
    } catch (error) {
      console.error('Failed to create checkout session:', error);

      return Response.json(
        {
          error: 'Internal Server Error',
          message: 'Impossible de créer la session de paiement',
        },
        { status: 500 }
      );
    }
  },
};
