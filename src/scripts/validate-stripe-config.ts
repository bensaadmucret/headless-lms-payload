#!/usr/bin/env tsx
/**
 * Script to validate Stripe configuration
 * Run with: npm run stripe:validate or tsx src/scripts/validate-stripe-config.ts
 */

import 'dotenv/config';
import { initializeStripe } from '../services/stripe';

async function validateStripeConfiguration() {
  console.log('🔍 Validating Stripe configuration...\n');

  try {
    // Initialize Stripe (this will validate all environment variables)
    const stripeClient = initializeStripe();
    
    // Test basic Stripe API connectivity
    console.log('\n🧪 Testing Stripe API connectivity...');
    const stripe = stripeClient.getStripe();
    
    // Try to retrieve account information (this verifies the API key works)
    const account = await stripe.accounts.retrieve();
    
    console.log('\n✅ Stripe API connection successful!');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Account Type: ${account.type}`);
    console.log(`   Country: ${account.country}`);
    console.log(`   Currency: ${account.default_currency?.toUpperCase()}`);
    
    if (stripeClient.isTestMode()) {
      console.log('\n⚠️  Running in TEST mode');
      console.log('   Use live keys for production');
    } else {
      console.log('\n✅ Running in LIVE mode');
    }
    
    console.log('\n✅ All Stripe configuration checks passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Stripe configuration validation failed:');
    console.error(error instanceof Error ? error.message : error);
    console.error('\nPlease check your .env file and ensure all Stripe variables are set correctly.');
    process.exit(1);
  }
}

// Run validation
validateStripeConfiguration();
