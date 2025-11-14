import Stripe from 'stripe';
import { STRIPE_API_VERSION } from './constants';

/**
 * Configuration for the Stripe client
 */
export interface StripeClientConfig {
  secretKey: string;
  webhookSecret: string;
}

/**
 * Centralized Stripe API client with environment-based configuration
 */
export class StripeClient {
  private stripe: Stripe;
  private webhookSecret: string;
  private secretKey: string;

  constructor(config: StripeClientConfig) {
    if (!config.secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }

    if (!config.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is required');
    }

    this.secretKey = config.secretKey;
    this.webhookSecret = config.webhookSecret;

    // Initialize Stripe with latest API version
    this.stripe = new Stripe(config.secretKey, {
      typescript: true,
      apiVersion: STRIPE_API_VERSION,
    });
  }

  /**
   * Get the Stripe instance
   */
  getStripe(): Stripe {
    return this.stripe;
  }

  /**
   * Get the webhook secret
   */
  getWebhookSecret(): string {
    return this.webhookSecret;
  }

  /**
   * Check if running in test mode
   */
  isTestMode(): boolean {
    return this.secretKey.startsWith('sk_test_');
  }
}
