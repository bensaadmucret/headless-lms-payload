import type { PayloadRequest } from 'payload';
import { getStripeClient } from '../../services/stripe/startup';
import { StripeCheckoutService } from '../../services/stripe/StripeCheckoutService';
import { loadStripeConfig } from '../../services/stripe/config';

interface CheckoutSessionRequestBody {
  prospectId?: string;
  billingCycle?: 'monthly' | 'yearly';
  selectedPrice?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  campaign?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  } | null;
  priceId?: string;
}

/**
 * POST /api/stripe/checkout-session
 * Creates a Stripe Checkout session for subscription
 */
export const createCheckoutSessionEndpoint = {
  path: '/stripe/checkout-session',
  method: 'post' as const,
  handler: async (req: PayloadRequest) => {
    try {
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

      const rawBody = await req.json();
      const body = (rawBody ?? {}) as CheckoutSessionRequestBody;

      const prospectId = typeof body.prospectId === 'string' ? body.prospectId : undefined;
      const email = typeof body.email === 'string' ? body.email.trim() : undefined;

      const billingCycleFromBody =
        body.billingCycle === 'monthly' || body.billingCycle === 'yearly'
          ? body.billingCycle
          : undefined;

      const legacyPriceId =
        typeof body.priceId === 'string' ? body.priceId.trim().toLowerCase() : undefined;

      const billingCycle =
        billingCycleFromBody ??
        (legacyPriceId === 'monthly' || legacyPriceId === 'yearly' ? legacyPriceId : undefined);

      if (!prospectId) {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'Le paramètre prospectId est requis',
          },
          { status: 400 }
        );
      }

      if (!billingCycle) {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'Le paramètre billingCycle est requis et doit être "monthly" ou "yearly"',
          },
          { status: 400 }
        );
      }

      if (!email) {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'Le paramètre email est requis',
          },
          { status: 400 }
        );
      }

      const config = loadStripeConfig();
      const stripePriceId =
        billingCycle === 'yearly' ? config.priceIdYearly : config.priceIdMonthly;

      if (!stripePriceId) {
        return Response.json(
          {
            error: 'Internal Server Error',
            message: "Le Price ID Stripe n'est pas configuré pour ce cycle de facturation",
          },
          { status: 500 }
        );
      }

      // Build success and cancel URLs
      const successUrl = `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${config.frontendUrl}/checkout/cancel`;

      // Create checkout session
      const stripeClient = getStripeClient();
      const checkoutService = new StripeCheckoutService(stripeClient, req.payload);

      const selectedPrice =
        typeof body.selectedPrice === 'number' && Number.isFinite(body.selectedPrice)
          ? body.selectedPrice
          : undefined;

      const campaign = body.campaign ?? undefined;
      const utmSource =
        campaign && typeof campaign.utm_source === 'string' ? campaign.utm_source : undefined;
      const utmMedium =
        campaign && typeof campaign.utm_medium === 'string' ? campaign.utm_medium : undefined;
      const utmCampaign =
        campaign && typeof campaign.utm_campaign === 'string' ? campaign.utm_campaign : undefined;

      const session = await checkoutService.createCheckoutSession({
        prospectId,
        priceId: stripePriceId,
        email,
        firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
        lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
        selectedPrice,
        billingCycle,
        utmSource,
        utmMedium,
        utmCampaign,
        successUrl,
        cancelUrl,
      });

      console.log('Checkout session created successfully:', {
        sessionId: session.sessionId,
        prospectId,
        billingCycle,
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
