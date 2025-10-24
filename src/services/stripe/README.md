# Stripe Service

This directory contains the Stripe integration for the billing system.

## Configuration

### Environment Variables

Add the following variables to your `.env` file:

```bash
# Stripe API Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (created in Stripe Dashboard)
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...

# Frontend URL for checkout redirects
FRONTEND_URL=http://localhost:5173  # or your production URL
```

### Initialization

The Stripe client is initialized lazily on first use. To manually initialize and validate configuration at startup, you can call:

```typescript
import { initializeStripe } from '@/services/stripe';

// In your server initialization code
try {
  initializeStripe();
  console.log('✅ Stripe initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Stripe:', error);
  // Handle error appropriately
}
```

### Usage in Endpoints

```typescript
import { getStripeClient } from '@/services/stripe';

export const myEndpoint = {
  path: '/my-endpoint',
  method: 'post',
  handler: async (req, res) => {
    try {
      const stripeClient = getStripeClient();
      const stripe = stripeClient.getStripe();
      
      // Use Stripe API
      const customer = await stripe.customers.create({
        email: 'user@example.com',
      });
      
      res.json({ success: true, customer });
    } catch (error) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
```

## Files

- `StripeClient.ts` - Main Stripe client wrapper
- `config.ts` - Configuration loading and validation
- `startup.ts` - Initialization and singleton management
- `index.ts` - Public exports

## Testing

For testing, use Stripe test mode keys:
- Secret key: `sk_test_...`
- Publishable key: `pk_test_...`
- Webhook secret: `whsec_...`

Test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Payment fails: `4000 0000 0000 0341`

## Production Checklist

Before deploying to production:

1. ✅ Replace test keys with live keys
2. ✅ Configure webhook endpoint in Stripe Dashboard
3. ✅ Set correct FRONTEND_URL
4. ✅ Create products and prices with French VAT (20%)
5. ✅ Test webhook signature verification
6. ✅ Monitor logs for any configuration warnings
