# Stripe Billing Integration Setup Guide

This guide will help you set up the Stripe billing integration for the MedCoach platform.

## Prerequisites

- Stripe account (sign up at https://stripe.com)
- Access to Stripe Dashboard
- Node.js and npm installed

## Step 1: Install Dependencies

The Stripe SDK has been installed. Verify with:

```bash
npm list stripe
```

## Step 2: Configure Environment Variables

Add the following variables to your `.env` file:

```bash
# ===== STRIPE BILLING =====
# Get keys from: https://dashboard.stripe.com/apikeys
# Test mode: sk_test_... and pk_test_...
# Production mode: sk_live_... and pk_live_...
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (created in Stripe Dashboard)
# Create prices with French VAT 20% included
# Example: 15€ TTC monthly, 120€ TTC yearly
STRIPE_PRICE_ID_MONTHLY=price_your_monthly_price_id_here
STRIPE_PRICE_ID_YEARLY=price_your_yearly_price_id_here

# Frontend URL for checkout redirects
# Development: http://localhost:5173
# Production: https://app.example.com
FRONTEND_URL=http://localhost:5173
```

## Step 3: Create Stripe Products and Prices

### 3.1 Create Product

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Name: "Premium"
4. Description: "Premium subscription for medical students"

### 3.2 Create Monthly Price with French VAT

1. In the product, click "Add another price"
2. Price model: Recurring
3. Billing period: Monthly
4. Price: 15.00 EUR
5. **Important**: Enable "Include tax in price"
6. Select "France" and tax rate "20%"
7. The system will calculate: 12.50€ HT + 2.50€ VAT = 15€ TTC
8. Save and copy the Price ID (starts with `price_`)

### 3.3 Create Yearly Price with French VAT

1. Add another price to the same product
2. Price model: Recurring
3. Billing period: Yearly
4. Price: 120.00 EUR
5. **Important**: Enable "Include tax in price"
6. Select "France" and tax rate "20%"
7. The system will calculate: 100€ HT + 20€ VAT = 120€ TTC
8. Save and copy the Price ID (starts with `price_`)

### 3.4 Configure Free Trial

The 30-day free trial is configured programmatically when creating checkout sessions, not in the product settings.

## Step 4: Get API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Secret key** (starts with `sk_test_` for test mode)
3. Add it to your `.env` file as `STRIPE_SECRET_KEY`

## Step 5: Configure Webhooks (After Deployment)

Webhooks will be configured in a later task. For now, you can use a placeholder:

```bash
STRIPE_WEBHOOK_SECRET=whsec_placeholder
```

## Step 6: Validate Configuration

Run the validation script to ensure everything is configured correctly:

```bash
npm run stripe:validate
```

This will:
- ✅ Check all required environment variables are set
- ✅ Validate the format of API keys and secrets
- ✅ Test connectivity to Stripe API
- ✅ Display your account information
- ✅ Confirm test/live mode

Expected output:
```
🔍 Validating Stripe configuration...

🔧 Initializing Stripe...
⚠️  Stripe is running in TEST mode
✅ Stripe configuration validated successfully
✅ Stripe initialized successfully

🧪 Testing Stripe API connectivity...

✅ Stripe API connection successful!
   Account ID: acct_xxxxx
   Account Type: standard
   Country: FR
   Currency: EUR

⚠️  Running in TEST mode
   Use live keys for production

✅ All Stripe configuration checks passed!
```

## Step 7: Update .env File

Update your `.env` file with the actual values:

```bash
STRIPE_SECRET_KEY=sk_test_51xxxxx...
STRIPE_WEBHOOK_SECRET=whsec_placeholder  # Will be updated later
STRIPE_PRICE_ID_MONTHLY=price_1xxxxx...
STRIPE_PRICE_ID_YEARLY=price_1xxxxx...
FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

### Error: Missing required Stripe environment variables

Make sure all five variables are set in your `.env` file:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID_MONTHLY
- STRIPE_PRICE_ID_YEARLY
- FRONTEND_URL

### Error: Invalid API key

- Check that your secret key starts with `sk_test_` or `sk_live_`
- Make sure there are no extra spaces or quotes
- Verify the key is copied correctly from Stripe Dashboard

### Warning: Price ID does not appear valid

- Price IDs should start with `price_`
- Make sure you copied the Price ID, not the Product ID
- Product IDs start with `prod_` and won't work

### Error: FRONTEND_URL is not a valid URL

- Make sure the URL includes the protocol (http:// or https://)
- No trailing slash
- Example: `http://localhost:5173` ✅
- Example: `localhost:5173` ❌

## Test Mode vs Live Mode

### Test Mode (Development)
- Use keys starting with `sk_test_` and `pk_test_`
- No real money is charged
- Use test card numbers (4242 4242 4242 4242)
- Webhooks can be tested with Stripe CLI

### Live Mode (Production)
- Use keys starting with `sk_live_` and `pk_live_`
- Real money is charged
- Real payment methods required
- Webhooks must be configured with public URL

## Next Steps

After completing this setup:

1. ✅ Task 1: Configure Stripe backend infrastructure (COMPLETED)
2. ⏭️ Task 2: Implement checkout session service and endpoint
3. ⏭️ Task 3: Implement webhook verification and processing
4. ⏭️ Task 4: Implement subscription-user synchronization
5. ⏭️ Task 5: Implement customer portal integration

## Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [French VAT Configuration](https://stripe.com/docs/tax/tax-rates)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Run `npm run stripe:validate` to diagnose configuration issues
3. Check Stripe Dashboard logs for API errors
4. Review the README.md in `src/services/stripe/`
