/**
 * Service pour créer des sessions du portail client Stripe
 * Permet aux utilisateurs de gérer leurs abonnements (paiement, annulation, factures)
 */

import Stripe from 'stripe';

export class StripePortalService {
  private stripe: Stripe;

  constructor(stripeClient: Stripe) {
    this.stripe = stripeClient;
  }

  /**
   * Crée une session de portail client Stripe
   * @param customerId - ID du client Stripe
   * @param returnUrl - URL de retour après utilisation du portail
   * @returns L'URL du portail client
   */
  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    console.log('[Stripe Portal Service] Création de session portail', {
      customerId,
      returnUrl,
      timestamp: new Date().toISOString(),
    });

    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      console.log('[Stripe Portal Service] Session portail créée avec succès', {
        customerId,
        sessionId: session.id,
        url: session.url,
        timestamp: new Date().toISOString(),
      });

      return session.url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Stripe Portal Service] Erreur lors de la création de session portail', {
        customerId,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw new Error(`Échec de création de session portail: ${errorMessage}`);
    }
  }
}
