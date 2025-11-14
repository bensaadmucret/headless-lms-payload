import Stripe from 'stripe';
import { getPayload } from 'payload';
import type { CollectionSlug, Payload } from 'payload';
import config from '../../payload.config';
import { STRIPE_API_VERSION } from '../../services/stripe/constants';
import {
  getSubscriptionPeriodEnd,
  getSubscriptionPeriodStart,
  getSubscriptionPriceId,
  mapStripeStatus,
  stripeUnixTimestampToISOString,
} from '../../services/stripe/helpers';
import { syncUserSubscription } from '../../utils/stripe/subscriptionSync';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

const SUBSCRIPTIONS_COLLECTION = 'subscriptions' as unknown as CollectionSlug;

type SubscriptionHistoryEntry = Record<string, unknown> & {
  type?: string;
  occurredAt?: string | null;
};

type SubscriptionDocument = {
  id: string | number;
  subscriptionId: string;
  customerId?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  history?: SubscriptionHistoryEntry[] | null;
  user?: string | number | { id?: string | number | null } | null;
  metadata?: Record<string, unknown> | null;
};

type UserDocument = {
  id: string | number;
  email?: string | null;
};

export const verifySessionEndpoint = {
  path: '/stripe/verify-session/:sessionId',
  method: 'get',
  handler: async (req: any, res: any) => {
    try {
      const { sessionId } = req.params as { sessionId: string };

      if (!sessionId) {
        return res.status(400).json({ 
          error: 'sessionId est requis' 
        });
      }

      // Récupérer la session Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        return res.status(404).json({ 
          error: 'Session non trouvée' 
        });
      }

      const payload = (await getPayload({
        config,
      })) as Payload;

      // Vérifier le statut de la session
      if (session.payment_status === 'paid') {
        const customerEmail = session.customer_details?.email ?? undefined;
        if (!customerEmail) {
          return res.status(400).json({
            error: 'Email client manquant sur la session Stripe',
          });
        }

        // Récupérer l'utilisateur via l'email
        const userResult = await payload.find({
          collection: 'users',
          where: {
            email: {
              equals: customerEmail,
            },
          },
          limit: 1,
        } as Parameters<Payload['find']>[0]);

        const userDoc = userResult.docs[0] as UserDocument | undefined;

        if (userDoc) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;

          if (!subscriptionId) {
            return res.status(400).json({
              error: 'Identifiant d’abonnement Stripe introuvable',
            });
          }

          // Récupérer l'abonnement Stripe
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const periodStart = stripeUnixTimestampToISOString(getSubscriptionPeriodStart(subscription));
          const periodEnd = stripeUnixTimestampToISOString(getSubscriptionPeriodEnd(subscription));
          const trialEnd = stripeUnixTimestampToISOString((subscription as any).trial_end);
          const cancelAtPeriodEnd = Boolean((subscription as any).cancel_at_period_end);
          const priceId = getSubscriptionPriceId(subscription) ?? '';
          const normalizedStatus = mapStripeStatus(subscription.status);
          const customerId = typeof session.customer === 'string' ? session.customer : null;

          // Vérifier si l'abonnement existe déjà
          const existingSubscription = (await payload.find({
            collection: SUBSCRIPTIONS_COLLECTION,
            where: {
              providerId: {
                equals: subscription.id,
              },
            },
            limit: 1,
          } as Parameters<Payload['find']>[0])) as {
            docs: SubscriptionDocument[];
          };

          const firstDoc = existingSubscription.docs[0];

          const existingMetadata =
            typeof firstDoc?.metadata === 'object' && firstDoc.metadata !== null
              ? (firstDoc.metadata as Record<string, unknown>)
              : {};

          // Préparer les données d'abonnement à persister
          const subscriptionData: Record<string, unknown> = {
            provider: 'stripe',
            providerId: subscription.id,
            user: userDoc.id,
            status: normalizedStatus,
            priceId,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            trialEnd,
            cancelAtPeriodEnd,
            subscriptionId: subscription.id,
            customerId,
            metadata: {
              ...existingMetadata,
              sessionId,
            },
          };
          let subscriptionDocId: string | number;
          if (firstDoc) {
            await payload.update({
              collection: SUBSCRIPTIONS_COLLECTION,
              id: firstDoc.id,
              data: subscriptionData,
            } as Parameters<Payload['update']>[0]);
            subscriptionDocId = firstDoc.id;
          } else {
            const created = (await payload.create({
              collection: SUBSCRIPTIONS_COLLECTION,
              data: subscriptionData,
            } as Parameters<Payload['create']>[0])) as SubscriptionDocument;
            subscriptionDocId = created.id;
          }

          await syncUserSubscription({
            id: subscriptionDocId,
            subscriptionId: subscription.id,
            status: normalizedStatus,
            currentPeriodEnd: periodEnd,
            user: userDoc.id,
            history: firstDoc?.history ?? null,
          }, payload);

          res.json({
            success: true,
            status: subscription.status,
            subscriptionId: subscription.id,
            userId: userDoc.id,
          });
        } else {
          res.status(404).json({ 
            error: 'Utilisateur non trouvé' 
          });
        }
      } else {
        res.json({
          success: false,
          status: session.payment_status,
          message: 'Paiement non complété'
        });
      }

    } catch (error) {
      console.error('Erreur vérification session:', error);
      res.status(500).json({ 
        error: 'Erreur lors de la vérification de la session' 
      });
    }
  },
};
