import type { PayloadRequest } from 'payload';
import { getStripeClient } from '../../services/stripe/startup';
import { StripeCheckoutService } from '../../services/stripe/StripeCheckoutService';
import { loadStripeConfig } from '../../services/stripe/config';

interface ProspectCheckoutRequestBody {
  prospectId?: string;
  billingCycle?: 'monthly' | 'yearly';
  selectedPrice?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  year?: string;
  examDate?: string;
  targetScore?: number;
  studyHoursPerWeek?: number;
  campaign?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  // Ancien champ pour compatibilité
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

      const body = (await req.json()) as ProspectCheckoutRequestBody | null;

      const prospectId = body?.prospectId?.toString().trim();

      // === Nouveau flux: checkout basé sur un prospect (anonyme) ===
      if (prospectId) {
        const billingCycle = body?.billingCycle;
        const selectedPrice = body?.selectedPrice;
        const email = body?.email?.trim();
        const year = body?.year;
        const examDate = body?.examDate;
        const targetScore = body?.targetScore;

        if (!email || billingCycle !== 'monthly' && billingCycle !== 'yearly' || typeof selectedPrice !== 'number' || Number.isNaN(selectedPrice)) {
          return Response.json(
            {
              error: 'Bad Request',
              message: 'Champs requis manquants ou invalides pour le checkout prospect (email, billingCycle, selectedPrice)',
            },
            { status: 400 },
          );
        }

        // Charger le prospect depuis Payload (cast pour collection custom)
        const prospect = await (req.payload as any).findByID({
          collection: 'prospects',
          id: prospectId,
        }) as any;

        if (!prospect || prospect.email !== email) {
          return Response.json(
            {
              error: 'Not Found',
              message: 'Prospect introuvable ou email incohérent',
            },
            { status: 404 },
          );
        }

        const config = loadStripeConfig();
        const stripeClient = getStripeClient();
        const stripe = stripeClient.getStripe();

        const stripePriceId =
          billingCycle === 'monthly' ? config.priceIdMonthly : config.priceIdYearly;

        // Construire les URLs de redirection
        const successUrl = `${config.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${config.frontendUrl}/checkout/cancel`;

        // Créer ou réutiliser le customer Stripe à partir du prospect
        let customerId: string | undefined = prospect.stripeCustomerId;

        if (!customerId) {
          const name = `${body?.firstName ?? prospect.firstName ?? ''} ${body?.lastName ?? prospect.lastName ?? ''}`.trim() || undefined;

          const customer = await stripe.customers.create({
            email,
            name,
            metadata: {
              prospectId,
            },
          });

          customerId = customer.id;

          await (req.payload as any).update({
            collection: 'prospects',
            id: prospectId,
            data: {
              stripeCustomerId: customerId,
            },
          });
        }

        const campaign = body?.campaign ?? {};

        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [
            {
              price: stripePriceId,
              quantity: 1,
            },
          ],
          subscription_data: {
            trial_period_days: 30,
            metadata: {
              prospectId,
              email,
              billingCycle,
              selectedPrice: selectedPrice.toString(),
              ...(typeof year === 'string' && year.trim() !== '' ? { year } : {}),
              ...(typeof examDate === 'string' && examDate.trim() !== '' ? { examDate } : {}),
              ...(typeof targetScore === 'number' && !Number.isNaN(targetScore)
                ? { targetScore: targetScore.toString() }
                : {}),
              ...(campaign.utm_source ? { utm_source: campaign.utm_source } : {}),
              ...(campaign.utm_medium ? { utm_medium: campaign.utm_medium } : {}),
              ...(campaign.utm_campaign ? { utm_campaign: campaign.utm_campaign } : {}),
              ...(typeof body?.studyHoursPerWeek === 'number' && !Number.isNaN(body.studyHoursPerWeek)
                ? { studyHoursPerWeek: body.studyHoursPerWeek.toString() }
                : {}),
              ...(
                (typeof year === 'string' && year.trim() !== '') &&
                  (typeof examDate === 'string' && examDate.trim() !== '')
                  ? { onboardingComplete: 'true' }
                  : {}
              ),
            },
          },
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: {
            prospectId,
            email,
            billingCycle,
            selectedPrice: selectedPrice.toString(),
            ...(typeof year === 'string' && year.trim() !== '' ? { year } : {}),
            ...(typeof examDate === 'string' && examDate.trim() !== '' ? { examDate } : {}),
            ...(typeof targetScore === 'number' && !Number.isNaN(targetScore)
              ? { targetScore: targetScore.toString() }
              : {}),
            ...(typeof body?.studyHoursPerWeek === 'number' && !Number.isNaN(body.studyHoursPerWeek)
              ? { studyHoursPerWeek: body.studyHoursPerWeek.toString() }
              : {}),
            // Si on a year + examDate, on considère l'onboarding "technique" comme fait
            ...(
              (typeof year === 'string' && year.trim() !== '') &&
                (typeof examDate === 'string' && examDate.trim() !== '')
                ? { onboardingComplete: 'true' }
                : {}
            ),
          },
        });

        await (req.payload as any).update({
          collection: 'prospects',
          id: prospectId,
          data: {
            stripeCheckoutSessionId: session.id,
          },
        });

        console.log('Checkout session created successfully for prospect:', {
          sessionId: session.id,
          prospectId,
          billingCycle,
        });

        return Response.json({
          sessionId: session.id,
          url: session.url,
        });
      }

      // === Flux legacy: checkout basé sur un utilisateur authentifié ===
      const priceId = body?.priceId;

      // Verify user authentication uniquement pour ce flux
      if (!req.user || !req.user.id) {
        return Response.json(
          {
            error: 'Unauthorized',
            message: 'Vous devez être connecté pour créer une session de paiement',
          },
          { status: 401 },
        );
      }

      if (!priceId) {
        return Response.json(
          {
            error: 'Bad Request',
            message: 'Le paramètre priceId est requis',
          },
          { status: 400 },
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
          { status: 400 },
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
