import Stripe from 'stripe';
import { getPayload } from 'payload';
import config from '../../payload.config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

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

      const payload = await getPayload({
        config,
      });

      // Vérifier le statut de la session
      if (session.payment_status === 'paid') {
        // Récupérer l'utilisateur via l'email
        const user = await payload.find({
          collection: 'users',
          where: {
            email: {
              equals: session.customer_details?.email || ''
            }
          }
        });

        if (user.docs.length > 0) {
          const userData = user.docs[0] as any;
          
          // Récupérer l'abonnement Stripe
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          // Créer ou mettre à jour l'abonnement dans Payload
          const subscriptionData: any = {
            provider: 'stripe',
            providerId: subscription.id,
            user: userData.id,
            status: subscription.status,
            priceId: subscription.items.data[0]?.price?.id || '',
            currentPeriodStart: new Date((subscription as any).current_period_start * 1000).toISOString(),
            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000).toISOString(),
            trialEnd: (subscription as any).trial_end ? new Date((subscription as any).trial_end * 1000).toISOString() : null,
            cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
            subscriptionId: subscription.id,
            metadata: {
              customerId: session.customer as string,
              sessionId: sessionId,
            }
          };

          // Vérifier si l'abonnement existe déjà
          const existingSubscription = await payload.find({
            collection: 'subscriptions',
            where: {
              providerId: {
                equals: subscription.id
              }
            }
          });

          const firstDoc = existingSubscription.docs[0];
          if (firstDoc) {
            // Mettre à jour l'abonnement existant
            const updatedSubscription = await payload.update({
              collection: 'subscriptions',
              id: firstDoc.id,
              data: subscriptionData
            });
          } else {
            // Créer un nouvel abonnement
            const newSubscription = await payload.create({
              collection: 'subscriptions',
              data: subscriptionData
            });
          }

          // Mettre à jour le statut de l'utilisateur
          // Mapper les statuts Stripe vers les statuts Payload valides
          const statusMapping: Record<string, 'active' | 'canceled' | 'past_due' | 'trialing' | 'none'> = {
            active: 'active',
            canceled: 'canceled',
            past_due: 'past_due',
            trialing: 'trialing',
            incomplete: 'past_due', // Map incomplete vers past_due
            incomplete_expired: 'canceled', // Map expired vers canceled
            unpaid: 'past_due'
          };

          const payloadStatus = statusMapping[subscription.status] || 'none';

          await payload.update({
            collection: 'users',
            id: userData.id,
            data: {
              subscriptionStatus: payloadStatus,
              subscriptionEndDate: new Date((subscription as any).current_period_end * 1000).toISOString()
            }
          });

          res.json({
            success: true,
            status: subscription.status,
            subscriptionId: subscription.id,
            userId: userData.id
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
