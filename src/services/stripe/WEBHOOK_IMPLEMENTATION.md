# Stripe Webhook Implementation

## Overview

This document describes the webhook verification and processing implementation for Stripe billing integration.

## Components Implemented

### 1. Webhook Signature Verification (`utils/stripe/webhookSignature.ts`)

Utility function that verifies the authenticity of incoming Stripe webhooks using the `Stripe-Signature` header.

**Features:**
- Verifies webhook signature using Stripe's SDK
- Logs security warnings for failed verifications
- Throws errors for invalid signatures

### 2. Stripe Webhook Service (`services/stripe/StripeWebhookService.ts`)

Main service for processing Stripe webhook events.

**Event Handlers:**
- `customer.subscription.created` - Creates subscription record and links to user
- `invoice.payment_succeeded` - Updates subscription to active status
- `customer.subscription.updated` - Updates subscription fields
- `customer.subscription.deleted` - Cancels subscription and updates user status
- `invoice.payment_failed` - Marks subscription as past_due

**Features:**
- Comprehensive event logging with timestamps and duration
- Automatic user synchronization
- Event history tracking
- Sanitized event data storage

### 3. Webhook Retry Queue Collection (`collections/WebhookRetryQueue.ts`)

Payload collection for managing failed webhook processing attempts.

**Fields:**
- `eventId` - Unique Stripe event ID
- `eventType` - Type of webhook event
- `payload` - Complete event data
- `retryCount` - Number of retry attempts
- `maxRetries` - Maximum retry attempts (default: 3)
- `lastError` - Error message from last failure
- `status` - Current status (pending, processing, success, failed)
- `nextRetryAt` - Scheduled retry time

### 4. Webhook Endpoint (`endpoints/stripe/webhook.ts`)

REST endpoint that receives and processes Stripe webhooks.

**Path:** `POST /api/stripe/webhook`

**Features:**
- Signature verification before processing
- Asynchronous event processing
- Automatic retry queue management
- Always returns 200 to Stripe (acknowledges receipt)
- Comprehensive logging

**Security:**
- No authentication required (signature is the authentication)
- Rejects requests with invalid signatures
- Logs all verification failures

### 5. Webhook Retry Queue Processor (`jobs/processWebhookRetryQueue.ts`)

Background job that processes failed webhooks from the retry queue.

**Features:**
- Runs every 5 minutes (configurable)
- Exponential backoff (5min, 10min, 20min)
- Processes up to 50 webhooks per run
- Marks permanently failed webhooks after max retries
- Comprehensive logging

### 6. Webhook Retry Queue Cleanup (`jobs/cleanupWebhookRetryQueue.ts`)

Background job that cleans up old webhook retry queue entries.

**Features:**
- Runs daily at 2 AM
- Removes entries older than 30 days
- Only removes 'success' or 'failed' status entries
- Processes up to 1000 entries per run
- Prevents collection from growing indefinitely

## Data Flow

```
Stripe → Webhook Endpoint → Signature Verification → Event Processing
                                    ↓                        ↓
                              Invalid (400)            Success/Failure
                                                             ↓
                                                    Failure → Retry Queue
                                                             ↓
                                                    Cron Job (every 5min)
                                                             ↓
                                                    Retry Processing
```

## User Synchronization

When subscription events are processed, the following user fields are automatically updated:

- `subscriptionStatus` - Matches subscription status (none, trialing, active, past_due, canceled)
- `subscriptionEndDate` - Set to current period end date
- `stripeCustomerId` - Set when subscription is created

**Note:** There is no `plan` field since the application has only one Premium offering with monthly/yearly billing cycles.

## Collections Updated

### Subscriptions Collection
- Added 'stripe' as a provider option
- Default provider changed to 'stripe'
- Updated labels and descriptions to be provider-agnostic (Stripe/Paddle)
- Removed Paddle-specific field labels (now generic: Customer ID, Subscription ID, Price ID)
- Removed unused `productId` field (not needed for Stripe)

### Users Collection
- Added `subscriptionStatus` field (none/trialing/active/past_due/canceled)
- Added `subscriptionEndDate` field
- `stripeCustomerId` field already existed
- **No `plan` field** - The application has only one Premium offering (monthly or yearly billing)

## Configuration

### Environment Variables Required
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe Dashboard

### Payload Config
- WebhookRetryQueue collection registered
- Webhook endpoint registered
- Webhook retry processor job registered (runs every 5 minutes)
- Webhook cleanup job registered (runs daily at 2 AM)

## Testing

To test the webhook implementation:

1. **Local Testing with Stripe CLI:**
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   stripe trigger customer.subscription.created
   ```

2. **Check Logs:**
   - Look for `[Stripe Webhook]` prefixed log messages
   - Verify signature verification
   - Confirm event processing

3. **Verify Database:**
   - Check Subscriptions collection for new records
   - Verify Users collection fields are updated
   - Check WebhookRetryQueue for any failed events

## Error Handling

### Signature Verification Failures
- Returns 400 status
- Logs security warning
- Does not add to retry queue

### Processing Failures
- Returns 200 to Stripe (acknowledges receipt)
- Adds event to retry queue
- Logs error details

### Retry Queue Processing
- Exponential backoff strategy
- Maximum 3 retry attempts
- Permanent failure after max retries

## Monitoring

Key metrics to monitor:
- Webhook processing success rate
- Retry queue size (should stay low with cleanup job)
- Failed webhooks count
- Processing duration
- Cleanup job execution (daily at 2 AM)

## Maintenance

### Webhook Retry Queue Cleanup
The cleanup job automatically removes old entries (>30 days) that are in 'success' or 'failed' status. This prevents the collection from growing indefinitely while preserving recent history for debugging.

**Manual cleanup (if needed):**
```typescript
// Run cleanup manually via Payload API
await payload.jobs.run('cleanup-webhook-retry-queue');
```

## Next Steps

After this implementation:
1. Configure webhook URL in Stripe Dashboard
2. Test with Stripe test mode
3. Monitor webhook processing logs
4. Set up alerts for failed webhooks
5. Implement frontend subscription management UI
