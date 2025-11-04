import Stripe from 'stripe';
import type { Payload } from 'payload';
import { StripeClient } from './StripeClient';

/**
 * Request parameters for creating a checkout session
 */
export interface CheckoutSessionRequest {
  userId: string;
  priceId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  betterAuthUserId?: string;
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
      console.log('Creating checkout session for user:', request.userId);

      const metadata = {
        userId: request.userId,
        ...(request.betterAuthUserId ? { betterAuthUserId: request.betterAuthUserId } : {}),
      };

      // Get or create Stripe customer
      const customerId = await this.getOrCreateCustomer(request.userId, request.email, metadata);

      // Create checkout session with 30-day free trial
      const session = await this.stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
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
  private async getOrCreateCustomer(
    userId: string,
    email: string,
    metadata: Record<string, string>
  ): Promise<string> {
    try {
      // Check if user already has a Stripe customer ID
      const user = await this.payload.findByID({
        collection: 'users',
        id: userId,
      }) as any;

      if (user.stripeCustomerId) {
        console.log('Using existing Stripe customer:', user.stripeCustomerId);
        return user.stripeCustomerId;
      }

      // Create new Stripe customer
      console.log('Creating new Stripe customer for:', email);
      const customer = await this.stripe.customers.create({
        email,
        metadata,
      });

      // Update user with Stripe customer ID
      await this.payload.update({
        collection: 'users',
        id: userId,
        data: {
          stripeCustomerId: customer.id,
        } as any,
      });

      console.log('Stripe customer created:', customer.id);
      return customer.id;
    } catch (error) {
      console.error('Failed to get or create customer:', error);
      throw new Error(
        `Failed to get or create customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
