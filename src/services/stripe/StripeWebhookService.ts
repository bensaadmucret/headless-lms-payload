import Stripe from 'stripe';
import { Payload } from 'payload';
import { StripeClient } from './StripeClient';
import { verifyWebhookSignature } from '../../utils/stripe/webhookSignature';
import { EmailNotificationService } from '../../services/EmailNotificationService';

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
  ) { }

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
    const metadata = subscription.metadata || {};
    const prospectIdFromMetadata = (metadata as any).prospectId as string | undefined;

    // Données d'onboarding éventuellement passées depuis le frontend via checkout-session
    const onboardingYearFromMetadata = (metadata as any).year as string | undefined;
    const onboardingExamDateFromMetadata = (metadata as any).examDate as string | undefined;
    const onboardingTargetScoreRaw = (metadata as any).targetScore as string | number | undefined;

    let user: any | null = null;
    let userCreatedFromProspect = false;

    // Nouveau flux: tenter de rattacher l'abonnement à un Prospect avant de tomber sur le flux email
    if (prospectIdFromMetadata) {
      try {
        const prospect = await (this.payload as any).findByID({
          collection: 'prospects',
          id: prospectIdFromMetadata,
        });

        if (prospect) {
          if (prospect.createdUser) {
            user = await this.payload.findByID({
              collection: 'users',
              id: prospect.createdUser as string,
            });
          } else {
            const randomPassword = Math.random().toString(36).slice(-12);

            user = await this.payload.create({
              collection: 'users',
              data: {
                email: prospect.email,
                firstName: prospect.firstName,
                lastName: prospect.lastName,
                role: prospect.role || 'student',
                password: randomPassword,
              } as any,
            });

            await (this.payload as any).update({
              collection: 'prospects',
              id: prospect.id,
              data: {
                userCreated: true,
                createdUser: user.id,
                status: 'paid',
              },
            });

            // Marquer que l'utilisateur a été créé à partir d'un prospect
            userCreatedFromProspect = true;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Stripe Webhook] Failed to link subscription to prospect', {
          subscriptionId: subscription.id,
          prospectId: prospectIdFromMetadata,
          error: errorMessage,
        });
      }
    }

    console.log('[Stripe Webhook] Checkpoint - User linking/creation done', {
      foundUser: !!user,
      userId: user?.id,
      userCreatedFromProspect
    });

    // Flux existant: retrouver l'utilisateur par email Stripe si aucun utilisateur trouvé via Prospect
    if (!user) {
      console.log('[Stripe Webhook] Checkpoint - Attempting to find user by Stripe email');
      const customer = await this.client.getStripe().customers.retrieve(subscription.customer as string);
      if (customer.deleted) {
        throw new Error('Customer has been deleted');
      }

      const email = customer.email;
      if (!email) {
        throw new Error('Customer email not found');
      }

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

      user = users.docs[0];
    }

    // Determine status (limité aux valeurs supportées par Users / Subscriptions)
    const rawStatus = subscription.status;
    const status: 'trialing' | 'active' | 'past_due' | 'canceled' =
      subscription.trial_end && subscription.trial_end > Date.now() / 1000
        ? 'trialing'
        : rawStatus === 'active'
          ? 'active'
          : rawStatus === 'past_due'
            ? 'past_due'
            : 'canceled';

    // Normaliser les dates pour Payload (string ISO) et gérer les valeurs manquantes
    const trialEndISO = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : undefined;

    const currentPeriodEndUnix = (subscription as any).current_period_end as number | null | undefined;

    const currentPeriodEndISO = currentPeriodEndUnix
      ? new Date(currentPeriodEndUnix * 1000).toISOString()
      : undefined;

    const createdAtISO = subscription.created
      ? new Date(subscription.created * 1000).toISOString()
      : new Date().toISOString();

    console.log('[Stripe Webhook] Checkpoint - Ready to create subscription record', {
      userId: user.id,
      subscriptionId: subscription.id
    });

    // Create subscription record (idempotent sur subscriptionId)
    let createdSubscription: any;
    try {
      createdSubscription = await this.payload.create({
        collection: 'subscriptions',
        data: {
          user: user.id,
          provider: 'stripe',
          customerId: subscription.customer as string,
          subscriptionId: subscription.id,
          priceId: subscription.items.data[0]?.price.id || '',
          status,
          trialEnd: trialEndISO,
          currentPeriodEnd: currentPeriodEndISO,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          amount: subscription.items.data[0]?.price.unit_amount || 0,
          currency: subscription.currency.toUpperCase(),
          history: [
            {
              type: 'subscription_created',
              occurredAt: createdAtISO,
              raw: this.sanitizeEventData(subscription),
            },
          ],
        },
        context: {
          disableSubscriptionSync: true,
        },
      });
      console.log('[Stripe Webhook] Checkpoint - Subscription record created', {
        id: createdSubscription.id
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      console.warn('[Stripe Webhook] Error creating subscription record', { error: errorMessage });

      // Si l'erreur vient d'un doublon sur subscriptionId, récupérer l'abonnement existant
      if (errorMessage.includes('subscriptionId')) {
        console.warn('[Stripe Webhook] Subscription already exists for subscriptionId, using existing record', {
          subscriptionId: subscription.id,
        });

        const existing = await this.payload.find({
          collection: 'subscriptions',
          where: {
            subscriptionId: { equals: subscription.id },
          },
          limit: 1,
        });

        if (existing.docs.length === 0) {
          // Si malgré tout aucun doc n'existe, relancer l'erreur originale
          throw error;
        }

        createdSubscription = existing.docs[0];
      } else {
        throw error;
      }
    }

    console.log('[Stripe Webhook] Checkpoint - Starting User Update');

    // Update user fields
    const userUpdateData: Record<string, any> = {
      stripeCustomerId: subscription.customer as string,
      subscriptionStatus: status,
      subscriptionEndDate: currentPeriodEndISO ?? null,
    };

    // Ne pas toucher à onboardingComplete ici (laisse false par défaut pour forcer l'onboarding profil)

    // Recopier la date d'examen si fournie (format "YYYY-MM-DD" envoyé par le front)
    if (typeof onboardingExamDateFromMetadata === 'string' && onboardingExamDateFromMetadata.trim() !== '') {
      userUpdateData.examDate = onboardingExamDateFromMetadata;
    }

    // Recopier l'objectif de score dans studyProfile.targetScore si fourni
    let targetScoreNumber: number | undefined;
    if (typeof onboardingTargetScoreRaw === 'string') {
      const parsed = Number(onboardingTargetScoreRaw);
      if (!Number.isNaN(parsed)) {
        targetScoreNumber = parsed;
      }
    } else if (typeof onboardingTargetScoreRaw === 'number' && !Number.isNaN(onboardingTargetScoreRaw)) {
      targetScoreNumber = onboardingTargetScoreRaw;
    }

    if (typeof targetScoreNumber === 'number') {
      const existingStudyProfile = (user as any).studyProfile || {};
      userUpdateData.studyProfile = {
        ...existingStudyProfile,
        targetScore: targetScoreNumber,
      };
    }

    // (Optionnel) on pourrait plus tard utiliser onboardingYearFromMetadata pour un champ dédié
    const onboardingStudyHoursRaw = (metadata as any).studyHoursPerWeek as string | number | undefined;
    const onboardingCompleteRaw = (metadata as any).onboardingComplete as string | undefined;

    if (typeof onboardingYearFromMetadata === 'string' && onboardingYearFromMetadata.trim() !== '') {
      const normalizedYear = onboardingYearFromMetadata.toLowerCase().trim();
      if (['pass', 'las'].includes(normalizedYear)) {
        userUpdateData.studyYear = normalizedYear;
      } else if (normalizedYear === '1') {
        // Fallback pour le frontend qui envoie parfois "1" pour PASS
        userUpdateData.studyYear = 'pass';
      } else {
        console.warn(`[Stripe Webhook] Invalid studyYear value: ${onboardingYearFromMetadata}. Allowed: pass, las.`);
      }
    }

    if (onboardingCompleteRaw === 'true') {
      userUpdateData.onboardingComplete = true;
    }

    // Recopier les heures d'étude dans studyProfile.studyHoursPerWeek si fourni
    let studyHoursNumber: number | undefined;
    if (typeof onboardingStudyHoursRaw === 'string') {
      const parsed = Number(onboardingStudyHoursRaw);
      if (!Number.isNaN(parsed)) {
        studyHoursNumber = parsed;
      }
    } else if (typeof onboardingStudyHoursRaw === 'number' && !Number.isNaN(onboardingStudyHoursRaw)) {
      studyHoursNumber = onboardingStudyHoursRaw;
    }

    if (typeof studyHoursNumber === 'number') {
      const existingStudyProfile = (user as any).studyProfile || {};
      // Fusionner avec le studyProfile potentiellement déjà mis à jour pour targetScore
      const currentProfileUpdate = userUpdateData.studyProfile || existingStudyProfile;

      userUpdateData.studyProfile = {
        ...currentProfileUpdate,
        studyHoursPerWeek: studyHoursNumber,
      };
    }

    await this.payload.update({
      collection: 'users',
      id: user.id,
      data: userUpdateData,
    });

    console.log('[Stripe Webhook] Debug trace', {
      userCreatedFromProspect,
      prospectIdFromMetadata,
      userId: user?.id,
      hasEmail: !!user?.email,
      hasSendEmail: !!(this.payload as any).sendEmail,
    });

    // Email de bienvenue / confirmation d'abonnement
    try {
      console.log('[Stripe Webhook] Attempting to send welcome email...');
      await EmailNotificationService.sendSubscriptionWelcomeEmail(
        { payload: this.payload } as any,
        user as any,
        createdSubscription as any,
      );
      console.log('[Stripe Webhook] Welcome email sent successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Stripe Webhook] Failed to send subscription welcome email', {
        subscriptionId: subscription.id,
        userId: user.id,
        error: errorMessage,
      });
    }

    // Si l'utilisateur vient d'un prospect, envoyer aussi un email de création de mot de passe
    if (userCreatedFromProspect && user?.email) {
      try {
        console.log('[Stripe Webhook] Attempting to generate password reset token...');
        const token = await (this.payload as any).forgotPassword({
          collection: 'users',
          data: { email: user.email },
          disableEmail: true,
        });

        if (token) {
          console.log('[Stripe Webhook] Token generated, sending reset email...');
          await EmailNotificationService.sendAccountSetupEmail(
            { payload: this.payload } as any,
            user as any,
            token,
          );
          console.log('[Stripe Webhook] Password reset email sent successfully');
        } else {
          console.warn('[Stripe Webhook] No reset token generated for user after subscription', {
            subscriptionId: subscription.id,
            userId: user.id,
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Stripe Webhook] Failed to send password reset email after subscription', {
          subscriptionId: subscription.id,
          userId: user.id,
          error: errorMessage,
        });
      }
    } else {
      console.log('[Stripe Webhook] Skipping password reset email', {
        userCreatedFromProspect,
        hasEmail: !!user?.email
      });
    }

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
    const invoiceWithSub = invoice as any;

    if (!invoiceWithSub.subscription) {
      console.log('[Stripe Webhook] Invoice has no subscription, skipping');
      return undefined;
    }

    const subscriptionId = invoiceWithSub.subscription as string;

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

    const subscription = subscriptions.docs[0] as any;

    // Fetch full subscription from Stripe to get current_period_end
    const stripeSubscription: any = await this.client.getStripe().subscriptions.retrieve(subscriptionId);

    const paidAtUnix = invoice.status_transitions?.paid_at ?? null;
    const paidAtISO = paidAtUnix
      ? new Date(paidAtUnix * 1000).toISOString()
      : new Date().toISOString();

    const subscriptionPeriodEndUnix = stripeSubscription.current_period_end as number | null | undefined;
    const subscriptionPeriodEndISO = subscriptionPeriodEndUnix
      ? new Date(subscriptionPeriodEndUnix * 1000).toISOString()
      : null;

    // Update subscription
    await this.payload.update({
      collection: 'subscriptions',
      id: subscription.id,
      data: {
        status: 'active',
        lastPaymentAt: paidAtISO,
        amount: invoice.amount_paid ?? 0,
        currency: (invoice.currency || 'eur').toUpperCase(),
        currentPeriodEnd: subscriptionPeriodEndISO,
        history: [
          ...(subscription.history || []),
          {
            type: 'payment_succeeded',
            occurredAt: paidAtISO,
            raw: this.sanitizeEventData(invoice),
          },
        ],
      },
      context: {
        disableSubscriptionSync: true,
      },
    });

    // Extraire l'ID utilisateur depuis le champ relationnel
    const userId = typeof subscription.user === 'object' && subscription.user !== null
      ? (subscription.user as any).id
      : subscription.user;

    if (userId) {
      await this.payload.update({
        collection: 'users',
        id: userId as string | number,
        data: {
          subscriptionStatus: 'active',
          subscriptionEndDate: subscriptionPeriodEndISO,
        },
      });
    }

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

    const existingSubscription = subscriptions.docs[0] as any;

    const updatedStatusRaw = subscription.status;
    const updatedStatus: 'trialing' | 'active' | 'past_due' | 'canceled' =
      updatedStatusRaw === 'trialing'
        ? 'trialing'
        : updatedStatusRaw === 'active'
          ? 'active'
          : updatedStatusRaw === 'past_due'
            ? 'past_due'
            : 'canceled';

    const updatedPeriodEndUnix = (subscription as any).current_period_end as number | null | undefined;
    const updatedPeriodEndISO = updatedPeriodEndUnix
      ? new Date(updatedPeriodEndUnix * 1000).toISOString()
      : null;

    // Update subscription
    await this.payload.update({
      collection: 'subscriptions',
      id: existingSubscription.id,
      data: {
        status: updatedStatus,
        priceId: subscription.items.data[0]?.price.id || existingSubscription.priceId,
        currentPeriodEnd: updatedPeriodEndISO,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        history: [
          ...(existingSubscription.history || []),
          {
            type: 'subscription_updated',
            occurredAt: new Date().toISOString(),
            raw: this.sanitizeEventData(subscription),
          },
        ],
      },
      context: {
        disableSubscriptionSync: true,
      },
    });

    // Update user if status changed
    const userId = typeof existingSubscription.user === 'object' && existingSubscription.user !== null
      ? (existingSubscription.user as any).id
      : existingSubscription.user;

    if (userId) {
      await this.payload.update({
        collection: 'users',
        id: userId as string | number,
        data: {
          subscriptionStatus: updatedStatus,
          subscriptionEndDate: updatedPeriodEndISO,
        },
      });
    }

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

    const existingSubscription = subscriptions.docs[0] as any;
    if (!existingSubscription) {
      throw new Error(`Subscription not found: ${subscription.id}`);
    }

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
            occurredAt: new Date().toISOString(),
            raw: this.sanitizeEventData(subscription),
          },
        ],
      },
      context: {
        disableSubscriptionSync: true,
      },
    });

    // Update user
    const userId = typeof existingSubscription.user === 'object' && existingSubscription.user !== null
      ? (existingSubscription.user as any).id
      : existingSubscription.user;

    if (userId) {
      await this.payload.update({
        collection: 'users',
        id: userId as string | number,
        data: {
          subscriptionStatus: 'canceled',
        },
      });
    }

    console.log('[Stripe Webhook] Subscription deleted', {
      subscriptionId: subscription.id,
    });

    return subscription.id;
  }

  /**
   * Handle invoice.payment_failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<string | undefined> {
    const invoiceWithSub = invoice as any;

    if (!invoiceWithSub.subscription) {
      console.log('[Stripe Webhook] Invoice has no subscription, skipping');
      return undefined;
    }

    const subscriptionId = invoiceWithSub.subscription as string;

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

    const subscription = subscriptions.docs[0] as any;
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

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
            occurredAt: new Date().toISOString(),
            raw: this.sanitizeEventData(invoice),
          },
        ],
      },
      context: {
        disableSubscriptionSync: true,
      },
    });

    // Update user
    const userId = typeof subscription.user === 'object' && subscription.user !== null
      ? (subscription.user as any).id
      : subscription.user;

    if (userId) {
      await this.payload.update({
        collection: 'users',
        id: userId as string | number,
        data: {
          subscriptionStatus: 'past_due',
        },
      });
    }

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
