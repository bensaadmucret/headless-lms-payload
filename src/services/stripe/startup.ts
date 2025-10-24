import { loadStripeConfig, validateStripeConfig } from './config';
import { StripeClient } from './StripeClient';

let stripeClientInstance: StripeClient | null = null;

/**
 * Initialize and validate Stripe configuration at application startup
 * This should be called once when the application starts
 * @returns Initialized StripeClient instance
 */
export function initializeStripe(): StripeClient {
  if (stripeClientInstance) {
    return stripeClientInstance;
  }

  try {
    console.log('🔧 Initializing Stripe...');
    
    // Load configuration from environment
    const config = loadStripeConfig();
    
    // Validate configuration
    validateStripeConfig(config);
    
    // Create Stripe client
    stripeClientInstance = new StripeClient({
      secretKey: config.secretKey,
      webhookSecret: config.webhookSecret,
    });
    
    console.log('✅ Stripe initialized successfully');
    
    return stripeClientInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Stripe:', error);
    throw error;
  }
}

/**
 * Get the initialized Stripe client instance
 * @throws Error if Stripe has not been initialized
 */
export function getStripeClient(): StripeClient {
  if (!stripeClientInstance) {
    throw new Error(
      'Stripe client not initialized. Call initializeStripe() first.'
    );
  }
  return stripeClientInstance;
}

/**
 * Check if Stripe is initialized
 */
export function isStripeInitialized(): boolean {
  return stripeClientInstance !== null;
}
