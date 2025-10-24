import Stripe from 'stripe';
import { Payload } from 'payload';
import { StripeClient } from './StripeClient';
import { verifyWebhookSignature } from '../../utils/stripe/webhookSignature';

export interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  subscriptionId?: string;
  error?: string;
}

/**
 * Service for processing Stripe webhook events
 */
export class StripeWebhookService {
  constructor(
    private client: StripeClient,
    private payload: Payload
  ) {}

  /**
   * Verify webhook signature
   */
  verifySignature(body: string, signature: string): Stripe.Event {
    return verifyWebhookSignature(
      body,
      signature,
      this.client.getWebhookSecret(),
      this.client.getStripe()
    );
  }

  /**
   * Process a webhook event
   */
  async processEvent(event: Stripe.Event): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    
    console.log('[Stripe Webhook] Processing event', {
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date(event.created * 1000).toISOString(),
    });

    try {
      let subscriptionId: string | undefined;

      switch (event.type) {
        case 'customer.subscription.created':
          subscriptionId = await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_succeeded':
          subscriptionId = await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.updated':
          subscriptionId = await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case 'customer.subscription.deleted':
          subscriptionId = await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'invoice.payment_failed':
          subscriptionId = await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log('[Stripe Webhook] Unhandled event type', { eventType: event.type });
      }

      const duration = Date.now() - startTime;
      console.log('[Stripe Webhook] Event processed successfully', {
        eventType: event.type,
        eventId: event.id,
        subscriptionId,
        duration: `${duration}ms`,
        status: 'success',
      });

      return {
        success: true,
        eventType: event.type,
        subscriptionId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('[Stripe Webhook] Event processing failed', {
        eventType: event.type,
        eventId: event.id,
        error: errorMessage,
        duration: `${duration}ms`,
        status: 'failed',
      });

      return {
        success: false,
        eventType: event.type,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle customer.subscription.created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<string> {
    console.log('[Stripe Webhook] Handling subscription.created', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });

    // Get customer email
    const customer = await this.client.getStripe().customers.retrieve(subscription.customer as string);
    if (customer.deleted) {
      throw new Error('Customer has been deleted');
    }

    const email = customer.email;
    if (!email) {
      throw new Error('Customer email not found');
    }

    // Find user by email
    const users = await this.payload.find({
      collection: 'users',
      where: {
        email: { equals: email },
      },
      limit: 1,
    });

    if (users.docs.length === 0) {
      throw new Error(`User not found for email: ${email}`);
    }

    const user = users.docs[0];

    // Determine status
    const status = subscription.trial_end && subscription.trial_end > Date.now() / 1000
      ? 'trialing'
      : subscription.status === 'active' ? 'active' : subscription.status;

    // Create subscription record
    await this.payload.create({
      collection: 'subscriptions',
      data: {
        user: user.id,
        provider: 'stripe',
        customerId: subscription.customer as string,
        subscriptionId: subscription.id,
        priceId: subscription.items.data[0]?.price.id || '',
        status,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        amount: subscription.items.data[0]?.price.unit_amount || 0,
        currency: subscription.currency.toUpperCase(),
        history: [
          {
            type: 'subscription_created',
            occurredAt: new Date(subscription.created * 1000),
            raw: this.sanitizeEventData(subscription),
          },
        ],
      },
    });

    // Update user fields
    await this.payload.update({
      collection: 'users',
      id: user.id,
      data: {
        stripeCustomerId: subscription.customer as string,
        subscriptionStatus: status,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      },
    });

    console.log('[Stripe Webhook] Subscription created', {
      subscriptionId: subscription.id,
      userId: user.id,
      status,
    });

    return subscription.id;
  }

  /**
   * Handle invoice.payment_succeeded event
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<string | undefined> {
    if (!invoice.subscription) {
      console.log('[Stripe Webhook] Invoice has no subscription, skipping');
      return undefined;
    }

    const subscriptionId = invoice.subscription as string;

    console.log('[Stripe Webhook] Handling invoice.payment_succeeded', {
      invoiceId: invoice.id,
      subscriptionId,
    });

    // Find subscription
    const subscriptions = await this.payload.find({
      collection: 'subscriptions',
      where: {
        subscriptionId: { equals: subscriptionId },
      },
      limit: 1,
    });

    if (subscriptions.docs.length === 0) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const subscription = subscriptions.docs[0];

    // Fetch full subscription from Stripe to get current_period_end
    const stripeSubscription = await this.client.getStripe().subscriptions.retrieve(subscriptionId);

    // Update subscription
    await this.payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        status: 'active',
        lastPaymentAt: new Date(invoice.status_transitions.paid_at! * 1000),
        amount: invoice.amount_paid,
        currency: invoice.currency.toUpperCase(),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        history: [
          ...(subscription.history || []),
          {
            type: 'payment_succeeded',
            occurredAt: new Date(invoice.status_transitions.paid_at! * 1000),
            raw: this.sanitizeEventData(invoice),
          },
        ],
      },
    });

    // Update user
    await this.payload.update({
      collection: 'users',
      id: subscription.user as string,
      data: {
        subscriptionStatus: 'active',
        subscriptionEndDate: new Date(stripeSubscription.current_period_end * 1000),
      },
    });

    console.log('[Stripe Webhook] Payment succeeded processed', {
      subscriptionId,
      invoiceId: invoice.id,
    });

    return subscriptionId;
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<string> {
    console.log('[Stripe Webhook] Handling subscription.updated', {
      subscriptionId: subscription.id,
    });

    // Find subscription
    const subscriptions = await this.payload.find({
      collection: 'subscriptions',
      where: {
        subscriptionId: { equals: subscription.id },
      },
      limit: 1,
    });

    if (subscriptions.docs.length === 0) {
      throw new Error(`Subscription not found: ${subscription.id}`);
    }

    const existingSubscription = subscriptions.docs[0];

    // Update subscription
    await this.payload.update({
      collection: 'subscriptions',
      id: existingSubscription.id,
      data: {
        status: subscription.status,
        priceId: subscription.items.data[0]?.price.id || existingSubscription.priceId,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        history: [
          ...(existingSubscription.history || []),
          {
            type: 'subscription_updated',
            occurredAt: new Date(),
            raw: this.sanitizeEventData(subscription),
          },
        ],
      },
    });

    // Update user if status changed
    await this.payload.update({
      collection: 'users',
      id: existingSubscription.user as string,
      data: {
        subscriptionStatus: subscription.status,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      },
    });

    console.log('[Stripe Webhook] Subscription updated', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    return subscription.id;
  }

  /**
   * Handle customer.subscription.deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<string> {
    console.log('[Stripe Webhook] Handling subscription.deleted', {
      subscriptionId: subscription.id,
    });

    // Find subscription
    const subscriptions = await this.payload.find({
      collection: 'subscriptions',
      where: {
        subscriptionId: { equals: subscription.id },
      },
      limit: 1,
    });

    if (subscriptions.docs.length === 0) {
      throw new Error(`Subscription not found: ${subscription.id}`);
    }

    const existingSubscription = subscriptions.docs[0];

    // Update subscription
    await this.payload.update({
      collection: 'subscriptions',
      id: existingSubscription.id,
      data: {
        status: 'canceled',
        history: [
          ...(existingSubscription.history || []),
          {
            type: 'subscription_canceled',
            occurredAt: new Date(),
            raw: this.sanitizeEventData(subscription),
          },
        ],
      },
    });

    // Update user
    await this.payload.update({
      collection: 'users',
      id: existingSubscription.user as string,
      data: {
        subscriptionStatus: 'canceled',
      },
    });

    console.log('[Stripe Webhook] Subscription deleted', {
      subscriptionId: subscription.id,
    });

    return subscription.id;
  }

  /**
   * Handle invoice.payment_failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<string | undefined> {
    if (!invoice.subscription) {
      console.log('[Stripe Webhook] Invoice has no subscription, skipping');
      return undefined;
    }

    const subscriptionId = invoice.subscription as string;

    console.log('[Stripe Webhook] Handling invoice.payment_failed', {
      invoiceId: invoice.id,
      subscriptionId,
    });

    // Find subscription
    const subscriptions = await this.payload.find({
      collection: 'subscriptions',
      where: {
        subscriptionId: { equals: subscriptionId },
      },
      limit: 1,
    });

    if (subscriptions.docs.length === 0) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    const subscription = subscriptions.docs[0];

    // Update subscription
    await this.payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        status: 'past_due',
        history: [
          ...(subscription.history || []),
          {
            type: 'payment_failed',
            occurredAt: new Date(),
            raw: this.sanitizeEventData(invoice),
          },
        ],
      },
    });

    // Update user
    await this.payload.update({
      collection: 'users',
      id: subscription.user as string,
      data: {
        subscriptionStatus: 'past_due',
      },
    });

    console.log('[Stripe Webhook] Payment failed processed', {
      subscriptionId,
      invoiceId: invoice.id,
    });

    return subscriptionId;
  }

  /**
   * Sanitize event data for storage (remove sensitive fields)
   */
  private sanitizeEventData(data: any): any {
    // Create a shallow copy and remove sensitive fields
    const sanitized = { ...data };
    
    // Remove potentially sensitive fields
    delete sanitized.client_secret;
    delete sanitized.payment_method_details;
    
    return sanitized;
  }
}
