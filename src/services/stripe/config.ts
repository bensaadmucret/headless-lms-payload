/**
 * Stripe configuration interface
 */
export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  priceIdMonthly: string;
  priceIdYearly: string;
  frontendUrl: string;
}

/**
 * Validate and load Stripe configuration from environment variables
 * @throws Error if required configuration is missing
 */
export function loadStripeConfig(): StripeConfig {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceIdMonthly = process.env.STRIPE_PRICE_ID_MONTHLY;
  const priceIdYearly = process.env.STRIPE_PRICE_ID_YEARLY;
  const frontendUrl = process.env.FRONTEND_URL;

  const missingVars: string[] = [];

  if (!secretKey) missingVars.push('STRIPE_SECRET_KEY');
  if (!webhookSecret) missingVars.push('STRIPE_WEBHOOK_SECRET');
  if (!priceIdMonthly) missingVars.push('STRIPE_PRICE_ID_MONTHLY');
  if (!priceIdYearly) missingVars.push('STRIPE_PRICE_ID_YEARLY');
  if (!frontendUrl) missingVars.push('FRONTEND_URL');

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Stripe environment variables: ${missingVars.join(', ')}\n` +
      'Please ensure all Stripe configuration is set in your .env file.'
    );
  }

  return {
    secretKey: secretKey!,
    webhookSecret: webhookSecret!,
    priceIdMonthly: priceIdMonthly!,
    priceIdYearly: priceIdYearly!,
    frontendUrl: frontendUrl!,
  };
}

/**
 * Validate Stripe configuration at startup
 * Logs warnings for test mode usage
 */
export function validateStripeConfig(config: StripeConfig): void {
  // Check if using test keys
  const isTestMode = config.secretKey.startsWith('sk_test_');
  
  if (isTestMode) {
    console.warn('⚠️  Stripe is running in TEST mode');
  } else {
    console.log('✅ Stripe is running in LIVE mode');
  }

  // Validate price IDs format
  if (!config.priceIdMonthly.startsWith('price_')) {
    console.warn('⚠️  STRIPE_PRICE_ID_MONTHLY does not appear to be a valid Stripe Price ID');
  }

  if (!config.priceIdYearly.startsWith('price_')) {
    console.warn('⚠️  STRIPE_PRICE_ID_YEARLY does not appear to be a valid Stripe Price ID');
  }

  // Validate webhook secret format
  if (!config.webhookSecret.startsWith('whsec_')) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET does not appear to be a valid webhook secret');
  }

  // Validate frontend URL
  try {
    new URL(config.frontendUrl);
  } catch (error) {
    throw new Error(`FRONTEND_URL is not a valid URL: ${config.frontendUrl}`);
  }

  console.log('✅ Stripe configuration validated successfully');
}
