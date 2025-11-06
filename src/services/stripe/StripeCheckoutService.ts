import Stripe from 'stripe';
import type { Payload } from 'payload';
import { StripeClient } from './StripeClient';

/**
 * Request parameters for creating a checkout session
 */
export interface CheckoutSessionRequest {
  prospectId: string;
  priceId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  selectedPrice?: number;
  billingCycle?: 'monthly' | 'yearly';
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Response from creating a checkout session
 */
export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

/**
 * Service for creating Stripe Checkout sessions for subscriptions
 */
export class StripeCheckoutService {
  private stripe: Stripe;

  constructor(
    private client: StripeClient,
    private payload: Payload
  ) {
    this.stripe = client.getStripe();
  }

  /**
   * Create a Stripe Checkout session for subscription
   * @param request - Checkout session parameters
   * @returns Session ID and checkout URL
   */
  async createCheckoutSession(
    request: CheckoutSessionRequest
  ): Promise<CheckoutSessionResponse> {
    try {
      console.log('Creating checkout session for prospect:', request.prospectId);

      const metadata: Stripe.MetadataParam = {
        prospectId: request.prospectId,
      };

      if (request.billingCycle) {
        metadata.billingCycle = request.billingCycle;
      }

      if (typeof request.selectedPrice === 'number') {
        metadata.selectedPrice = request.selectedPrice.toString();
      }

      if (request.utmSource) {
        metadata.utmSource = request.utmSource;
      }

      if (request.utmMedium) {
        metadata.utmMedium = request.utmMedium;
      }

      if (request.utmCampaign) {
        metadata.utmCampaign = request.utmCampaign;
      }

      // Get or create Stripe customer
      const customerId = await this.getOrCreateCustomerFromProspect(request);

      // Create checkout session with 30-day free trial
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: request.priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: 30,
          metadata,
        },
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        metadata,
      });


      await this.payload.update({
        collection: 'prospects',
        id: request.prospectId,
        data: {
          checkoutSessionId: session.id,
          status: 'payment_in_progress',
        },
      });

      console.log('Checkout session created:', session.id);

      return {
        sessionId: session.id,
        url: session.url!,
      };
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get existing Stripe customer or create a new one
   * @param userId - User ID from Payload
   * @param email - User email
   * @returns Stripe Customer ID
   */
  private async getOrCreateCustomerFromProspect(
    request: CheckoutSessionRequest
  ): Promise<string> {
    try {
      // Check if prospect already has a Stripe customer ID
      const prospect = await this.payload.findByID({
        collection: 'prospects',
        id: request.prospectId,
      }) as any;

      if (prospect?.stripeCustomerId) {
        console.log('Using existing Stripe customer for prospect:', prospect.stripeCustomerId);
        return prospect.stripeCustomerId;
      }

      // Create new Stripe customer for prospect
      console.log('Creating new Stripe customer for prospect:', request.email);
      const customerMetadata: Stripe.MetadataParam = {
        prospectId: request.prospectId,
      };

      if (request.billingCycle) {
        customerMetadata.billingCycle = request.billingCycle;
      }

      if (typeof request.selectedPrice === 'number') {
        customerMetadata.selectedPrice = request.selectedPrice.toString();
      }

      if (request.utmSource) {
        customerMetadata.utmSource = request.utmSource;
      }

      if (request.utmMedium) {
        customerMetadata.utmMedium = request.utmMedium;
      }

      if (request.utmCampaign) {
        customerMetadata.utmCampaign = request.utmCampaign;
      }

      const customer = await this.stripe.customers.create({
        email: request.email,
        metadata: customerMetadata,
        name: [request.firstName, request.lastName]
          .filter((part) => Boolean(part && part.trim()))
          .join(' ')
          .trim() || undefined,
      });

      // Update prospect with Stripe customer ID
      await this.payload.update({
        collection: 'prospects',
        id: request.prospectId,
        data: {
          stripeCustomerId: customer.id,
          status: 'payment_in_progress',
          checkoutSessionId: undefined,
        },
      });

      console.log('Stripe customer created for prospect:', customer.id);
      return customer.id;
    } catch (error) {
      console.error('Failed to get or create customer for prospect:', error);
      throw new Error(
        `Failed to get or create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
