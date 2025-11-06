import Stripe from 'stripe';
import { Payload } from 'payload';
import { StripeClient } from './StripeClient';
import { verifyWebhookSignature } from '../../utils/stripe/webhookSignature';
import type { ProspectStatus } from '../../collections/Prospects';
import type { Config } from '../../payload-types';

type SubscriptionDocument = {
  id: string;
  user?: string | number | { id: string | number } | null;
  subscriptionId?: string | null;
  history?: Array<Record<string, unknown>>;
  currentPeriodEnd?: string | null;
};

const SUBSCRIPTIONS_COLLECTION: keyof Config['collections'] = 'subscriptions';
const USERS_COLLECTION: keyof Config['collections'] = 'users';

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
        case 'checkout.session.completed':
          subscriptionId = await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case 'checkout.session.expired':
          await this.handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
          break;

        case 'checkout.session.async_payment_failed':
          await this.handleCheckoutSessionAsyncPaymentFailed(event.data.object as Stripe.Checkout.Session);
          break;

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
   * Handle checkout.session.completed event
   */
  private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<string | undefined> {
    console.log('[Stripe Webhook] Handling checkout.session.completed', {
      sessionId: session.id,
      customer: session.customer,
      subscription: session.subscription,
    });

    const metadata = session.metadata ?? {};
    const prospectId = this.extractProspectId(metadata);
    const email = session.customer_details?.email ?? session.customer_email ?? undefined;
    const customerId = typeof session.customer === 'string' ? session.customer : undefined;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : undefined;

    let lastPaymentAttemptAt: string | null = null;
    if (session.payment_intent && typeof session.payment_intent !== 'string') {
      const { created } = session.payment_intent;
      if (typeof created === 'number') {
        lastPaymentAttemptAt = this.toISOString(created * 1000);
      }
    }

    const updated = await this.updateProspectFromIdentifiers({
      prospectId,
      email,
      customerId,
      data: {
        status: 'ready_for_password',
        stripeCustomerId: customerId,
        checkoutSessionId: session.id,
        subscriptionId,
        lastPaymentAttemptAt: lastPaymentAttemptAt ?? new Date().toISOString(),
      },
    });

    if (!updated) {
      console.warn('[Stripe Webhook] No matching prospect for checkout.session.completed', {
        sessionId: session.id,
        prospectId,
        email,
        customerId,
      });
    }

    return subscriptionId;
  }

  /**
   * Handle checkout.session.expired event
   */
  private async handleCheckoutSessionExpired(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = session.metadata ?? {};
    const prospectId = this.extractProspectId(metadata);
    const email = session.customer_details?.email ?? session.customer_email ?? undefined;
    const customerId = typeof session.customer === 'string' ? session.customer : undefined;

    const updated = await this.updateProspectFromIdentifiers({
      prospectId,
      email,
      customerId,
      data: {
        status: 'abandoned',
        checkoutSessionId: session.id,
      },
    });

    if (!updated) {
      console.warn('[Stripe Webhook] No matching prospect for checkout.session.expired', {
        sessionId: session.id,
        prospectId,
        email,
        customerId,
      });
    }
  }

  /**
   * Handle checkout.session.async_payment_failed event
   */
  private async handleCheckoutSessionAsyncPaymentFailed(session: Stripe.Checkout.Session): Promise<void> {
    const metadata = session.metadata ?? {};
    const prospectId = this.extractProspectId(metadata);
    const email = session.customer_details?.email ?? session.customer_email ?? undefined;
    const customerId = typeof session.customer === 'string' ? session.customer : undefined;

    const updated = await this.updateProspectFromIdentifiers({
      prospectId,
      email,
      customerId,
      data: {
        status: 'payment_failed',
        checkoutSessionId: session.id,
        lastPaymentAttemptAt: new Date().toISOString(),
      },
    });

    if (!updated) {
      console.warn('[Stripe Webhook] No matching prospect for checkout.session.async_payment_failed', {
        sessionId: session.id,
        prospectId,
        email,
        customerId,
      });
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
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error(`User not found for email: ${email}`);
    }

    // Update user
    await this.payload.update({
      collection: 'users',
      id: user.id,
      data: {
        stripeCustomerId: subscription.customer as string,
        subscriptionStatus: 'active',
        subscriptionEndDate: this.resolveStripeTimestamp(subscription.current_period_end) ?? null,
      },
    });

    console.log('[Stripe Webhook] Subscription created', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    return subscription.id;
  }

  /**
   * Handle customer.subscription.updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<string> {
    console.log('[Stripe Webhook] Handling subscription.updated', {
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
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error(`User not found for email: ${email}`);
    }

    // Update user
    await this.payload.update({
      collection: 'users',
      id: user.id,
      data: {
        stripeCustomerId: subscription.customer as string,
        subscriptionStatus: this.mapStripeStatus(subscription.status),
        subscriptionEndDate: this.toISOString(subscription.current_period_end * 1000) ?? null,
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
    const existingSubscription = await this.findSubscriptionByStripeId(subscription.id);
    if (!existingSubscription) {
      throw new Error(`Subscription not found: ${subscription.id}`);
    }

    // Update subscription
    await this.payload.update({
      collection: SUBSCRIPTIONS_COLLECTION,
      id: existingSubscription.id,
      data: {
        status: 'canceled',
        history: [
          ...(existingSubscription.history || []),
          {
            type: 'subscription_canceled',
            occurredAt: new Date().toISOString(),
            raw: this.sanitizeEventData(subscription),
          },
        ],
      },
    });

    // Update user
    await this.payload.update({
      collection: USERS_COLLECTION,
      id: this.resolveUserId(existingSubscription.user) as string,
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
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<string | undefined> {
    const subscriptionId = this.resolveInvoiceSubscriptionId(invoice);
    if (!subscriptionId) {
      return undefined;
    }

    console.log('[Stripe Webhook] Handling invoice.payment_succeeded', {
      invoiceId: invoice.id,
      subscriptionId,
    });

    const subscription = await this.findSubscriptionByStripeId(subscriptionId);
    if (!subscription) {
      console.warn('[Stripe Webhook] Subscription not found for payment_succeeded', {
        subscriptionId,
      });
      return undefined;
    }

    const updatedHistory = [
      ...(subscription.history ?? []),
      {
        type: 'payment_succeeded',
        occurredAt: this.toISOString(this.resolveInvoiceTimestamp(invoice)) ?? new Date().toISOString(),
        raw: this.sanitizeEventData(invoice),
      },
    ];

    await this.payload.update({
      collection: SUBSCRIPTIONS_COLLECTION,
      id: subscription.id,
      data: {
        status: 'active',
        history: updatedHistory,
      },
    });

    const subscriptionUserId = this.resolveUserId(subscription.user);
    if (subscriptionUserId) {
      await this.payload.update({
        collection: USERS_COLLECTION,
        id: subscriptionUserId,
        data: {
          subscriptionStatus: 'active',
          subscriptionEndDate: subscription.currentPeriodEnd ?? null,
        },
      });
    }

    await this.updateProspectFromIdentifiers({
      prospectId: this.extractProspectId(invoice.metadata as Stripe.Metadata | null | undefined),
      email: invoice.customer_email ?? undefined,
      customerId: typeof invoice.customer === 'string' ? invoice.customer : undefined,
      data: {
        status: 'ready_for_password',
        subscriptionId,
      },
    });

    return subscriptionId;
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<string | undefined> {
    const subscriptionId = this.resolveInvoiceSubscriptionId(invoice);
    if (!subscriptionId) {
      return undefined;
    }

    console.log('[Stripe Webhook] Handling invoice.payment_failed', {
      invoiceId: invoice.id,
      subscriptionId,
    });

    const subscription = await this.findSubscriptionByStripeId(subscriptionId);
    if (!subscription) {
      console.warn('[Stripe Webhook] Subscription not found for payment_failed', {
        subscriptionId,
      });
      return undefined;
    }

    const updatedHistory = [
      ...(subscription.history ?? []),
      {
        type: 'payment_failed',
        occurredAt: this.toISOString(this.resolveInvoiceTimestamp(invoice)) ?? new Date().toISOString(),
        raw: this.sanitizeEventData(invoice),
      },
    ];

    await this.payload.update({
      collection: SUBSCRIPTIONS_COLLECTION,
      id: subscription.id,
      data: {
        status: 'past_due',
        history: updatedHistory,
      },
    });

    const subscriptionUserId = this.resolveUserId(subscription.user);
    if (subscriptionUserId) {
      await this.payload.update({
        collection: USERS_COLLECTION,
        id: subscriptionUserId,
        data: {
          subscriptionStatus: 'past_due',
          subscriptionEndDate: subscription.currentPeriodEnd ?? null,
        },
      });
    }

    await this.updateProspectFromIdentifiers({
      prospectId: this.extractProspectId(invoice.metadata as Stripe.Metadata | null | undefined),
      email: invoice.customer_email ?? undefined,
      customerId: typeof invoice.customer === 'string' ? invoice.customer : undefined,
      data: {
        status: 'payment_failed',
        lastPaymentAttemptAt: new Date().toISOString(),
      },
    });

    return subscriptionId;
  }

  private resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
    const { subscription } = invoice;
    if (!subscription || typeof subscription !== 'string') {
      return undefined;
    }
    return subscription;
  }

  private resolveInvoiceTimestamp(invoice: Stripe.Invoice): number | undefined {
    if (typeof invoice.created === 'number') {
      return invoice.created * 1000;
    }
    return undefined;
  }

  private async findSubscriptionByStripeId(subscriptionId: string): Promise<SubscriptionDocument | null> {
    const subscriptions = await this.payload.find({
      collection: SUBSCRIPTIONS_COLLECTION,
      where: {
        subscriptionId: { equals: subscriptionId },
      },
      limit: 1,
    });

    if (subscriptions.docs.length === 0) {
      return null;
    }

    return subscriptions.docs[0] as SubscriptionDocument;
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

  private extractProspectId(metadata?: Stripe.Metadata | null): string | undefined {
    if (!metadata) {
      return undefined;
    }

    const possibleKeys = ['prospectId', 'prospect_id', 'prospectID'];
    for (const key of possibleKeys) {
      const value = metadata[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private normalizeEmail(email?: string | null): string | undefined {
    return typeof email === 'string' && email.length > 0 ? email.trim().toLowerCase() : undefined;
  }

  private async resolveProspectIdentifiers({
    prospectId,
    email,
    customerId,
  }: {
    prospectId?: string | undefined;
    email?: string | undefined;
    customerId?: string | undefined;
  }): Promise<{ prospectId?: string; email?: string }> {
    let resolvedProspectId = prospectId;
    let resolvedEmail = this.normalizeEmail(email);

    if ((!resolvedProspectId || !resolvedEmail) && customerId) {
      try {
        const customer = await this.client.getStripe().customers.retrieve(customerId);
        if (!customer.deleted) {
          resolvedEmail = resolvedEmail ?? this.normalizeEmail(customer.email);
          const customerMetadata = (customer.metadata ?? {}) as Stripe.Metadata;
          resolvedProspectId = resolvedProspectId ?? this.extractProspectId(customerMetadata);
        }
      } catch (error) {
        console.warn('[Stripe Webhook] Unable to retrieve customer for prospect resolution', {
          customerId,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    return { prospectId: resolvedProspectId, email: resolvedEmail };
  }

  private async updateProspectFromIdentifiers({
    prospectId,
    email,
    customerId,
    data,
  }: {
    prospectId?: string | undefined;
    email?: string | undefined;
    customerId?: string | undefined;
    data: {
      status?: ProspectStatus;
      stripeCustomerId?: string | undefined;
      checkoutSessionId?: string | undefined;
      subscriptionId?: string | undefined;
      lastPaymentAttemptAt?: string | undefined;
    };
  }): Promise<boolean> {
    const identifiers = await this.resolveProspectIdentifiers({ prospectId, email, customerId });
    const normalizedProspectId = identifiers.prospectId;
    const normalizedEmail = identifiers.email;

    if (!normalizedProspectId && !normalizedEmail) {
      return false;
    }

    let prospect: any = null;

    prospect = await this.findProspect(normalizedProspectId, normalizedEmail);

    if (!prospect) {
      return false;
    }

    const updateData: Record<string, unknown> = {};

    if (data.status) {
      updateData.status = data.status;
    }
    if (data.stripeCustomerId) {
      updateData.stripeCustomerId = data.stripeCustomerId;
    }
    if (data.checkoutSessionId) {
      updateData.checkoutSessionId = data.checkoutSessionId;
    }
    if (data.subscriptionId) {
      updateData.subscriptionId = data.subscriptionId;
    }
    if (data.lastPaymentAttemptAt) {
      updateData.lastPaymentAttemptAt = data.lastPaymentAttemptAt;
    }

    await this.payload.update({
      collection: 'prospects' as CollectionSlug,
      id: prospect.id,
      data: updateData,
    });

    console.log('[Stripe Webhook] Prospect updated', {
      prospectId: prospect.id,
      status: updateData.status,
    });

    return true;
  }

  private toISOString(timestamp?: number): string | null {
    if (timestamp === undefined) {
      return null;
    }

    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  private resolveUserId(userField: Stripe.Subscription['customer'] | Stripe.Subscription['id'] | unknown): string | number | null {
    if (!userField) {
      return null;
    }

    if (typeof userField === 'string' || typeof userField === 'number') {
      return userField;
    }

    if (typeof userField === 'object' && userField !== null && 'id' in userField) {
      const value = (userField as { id?: unknown }).id;
      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }
    }

    return null;
  }

  private mapStripeStatus(status: Stripe.Subscription.Status | string): 'trialing' | 'active' | 'canceled' | 'past_due' {
    switch (status) {
      case 'trialing':
        return 'trialing';
      case 'active':
        return 'active';
      case 'canceled':
      case 'incomplete_expired':
        return 'canceled';
      case 'past_due':
      case 'unpaid':
      case 'incomplete':
      case 'paused':
        return 'past_due';
      default:
        return 'past_due';
    }
  }

  private async findUserByEmail(email: string): Promise<{ id: string | number } | null> {
    const users = await this.payload.find({
      collection: 'users',
      where: {
        email: { equals: email },
      },
      limit: 1,
    });

    return users.docs[0] ?? null;
  }

  private async findProspect(prospectId?: string, email?: string): Promise<any | null> {
    if (prospectId) {
      try {
        return await this.payload.findByID({ collection: 'prospects' as CollectionSlug, id: prospectId });
      } catch (error) {
        console.warn('[Stripe Webhook] Prospect lookup by ID failed', {
          prospectId,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    if (email) {
      const existing = await this.payload.find({
        collection: 'prospects' as CollectionSlug,
        where: {
          email: { equals: email },
        },
        limit: 1,
      });

      if (existing.docs.length > 0) {
        return existing.docs[0];
      }
    }

    return null;
  }
}
