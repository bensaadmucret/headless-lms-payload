/**
 * Endpoint POST /api/stripe/portal-session
 * Crée une session du portail client Stripe pour gérer l'abonnement
 */

import { PayloadRequest } from 'payload';
import { getStripeClient } from '../../services/stripe';
import { StripePortalService } from '../../services/stripe/StripePortalService';

export const portalSessionEndpoint = {
  path: '/stripe/portal-session',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    console.log('[Portal Session Endpoint] Requête reçue', {
      userId: req.user?.id,
      timestamp: new Date().toISOString(),
    });

    // 1. Vérifier l'authentification
    if (!req.user) {
      console.warn('[Portal Session Endpoint] Utilisateur non authentifié');
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
      });

      if (subscriptions.docs.length === 0) {
        console.warn('[Portal Session Endpoint] Aucun abonnement trouvé', { userId });
        return new Response(
          JSON.stringify({ error: 'Aucun abonnement actif trouvé' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const subscription = subscriptions.docs[0]!; // Assert non-null après vérification length > 0

      // 3. Vérifier que l'abonnement appartient bien à l'utilisateur (double vérification)
      const subscriptionUserId = typeof subscription.user === 'object' && subscription.user?.id
        ? subscription.user.id
        : subscription.user;

      if (subscriptionUserId !== userId) {
        console.error('[Portal Session Endpoint] Tentative d\'accès non autorisé', {
          userId,
          subscriptionUserId,
        });
        return new Response(
          JSON.stringify({ error: 'Accès non autorisé à cet abonnement' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 4. Vérifier que l'abonnement a un customerId
      if (!subscription.customerId) {
        console.error('[Portal Session Endpoint] Customer ID manquant', {
          userId,
          subscriptionId: subscription.id,
        });
        return new Response(
          JSON.stringify({ error: 'Customer ID Stripe manquant' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 5. Créer la session portail
      const stripeClient = getStripeClient();
      const stripe = stripeClient.getStripe();
      const portalService = new StripePortalService(stripe);

      // URL de retour - soit depuis l'env, soit fallback
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const returnUrl = `${frontendUrl}/account/subscription`;

      const portalUrl = await portalService.createPortalSession(
        subscription.customerId,
        returnUrl
      );

      console.log('[Portal Session Endpoint] Session portail créée avec succès', {
        userId,
        customerId: subscription.customerId,
        timestamp: new Date().toISOString(),
      });

      // 6. Retourner l'URL du portail
      return new Response(
        JSON.stringify({ url: portalUrl }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Portal Session Endpoint] Erreur', {
        userId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          error: 'Erreur lors de la création de la session portail',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};
