/**
 * Endpoint GET /api/me/subscription
 * Récupère les données d'abonnement de l'utilisateur actuel
 */

import { PayloadRequest } from 'payload';

export const meSubscriptionEndpoint = {
  path: '/me/subscription',
  method: 'get',
  handler: async (req: PayloadRequest): Promise<Response> => {
    console.log('[Me Subscription Endpoint] Requête reçue', {
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    // 1. Vérifier l'authentification
    if (!req.user) {
      console.warn('[Me Subscription Endpoint] Utilisateur non authentifié');
      return new Response(
        JSON.stringify({ error: 'Authentification requise' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = req.user.id;

    try {
      // 2. Récupérer l'abonnement de l'utilisateur
      const subscriptions = await req.payload.find({
        collection: 'subscriptions',
        where: {
          user: {
            equals: userId,
          },
        },
        limit: 1,
        sort: '-createdAt', // Plus récent en premier
      });

      // 3. Si aucun abonnement, retourner null
      if (subscriptions.docs.length === 0) {
        console.log('[Me Subscription Endpoint] Aucun abonnement trouvé', { userId });
        return new Response(
          JSON.stringify({ subscription: null }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const subscription = subscriptions.docs[0]!;

      // 4. Extraire et formater les données d'abonnement
      const billingCycle = subscription.priceId?.includes('monthly') ? 'monthly' : 
                          subscription.priceId?.includes('yearly') ? 'yearly' : 'unknown';

      const subscriptionData = {
        id: subscription.id,
        status: subscription.status,
        billingCycle,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd || null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
        provider: subscription.provider,
        priceId: subscription.priceId,
        amount: subscription.amount,
        currency: subscription.currency || 'EUR',
        lastPaymentAt: subscription.lastPaymentAt || null,
      };

      console.log('[Me Subscription Endpoint] Abonnement trouvé', {
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
        billingCycle,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ subscription: subscriptionData }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Me Subscription Endpoint] Erreur', {
        userId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: 'Erreur lors de la récupération de l\'abonnement',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
