import type { Payload } from 'payload';
import type { WebhookRetryQueue } from '../../payload-types';

import { logger } from '../logger';

const WEBHOOK_RETRY_QUEUE_COLLECTION = 'webhook-retry-queue' as const;

const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const VALID_STATUSES = new Set(['trialing', 'active', 'past_due', 'canceled']);

type SubscriptionHistoryEntry = {
  type?: string;
  raw?: Record<string, unknown> | null;
};

type SubscriptionDoc = {
  id: string | number;
  subscriptionId?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | Date | null;
  user?: string | number | { id?: string | number | null } | null;
  history?: SubscriptionHistoryEntry[] | null;
};

type NullableId = string | number | null;

type WebhookRetryQueueDoc = WebhookRetryQueue;

type QueuePayload = Record<string, unknown> & {
  subscriptionId: string | number;
  userId: NullableId;
  reason: string;
  source: 'syncUserSubscription';
};

export async function syncUserSubscription(subscription: SubscriptionDoc, payload: Payload): Promise<void> {
  if (!payload) {
    logger.error('[Subscription Sync] Payload instance manquante');
    return;
  }

  const userId = extractUserId(subscription.user);

  if (!userId) {
    const reason = 'Aucun utilisateur associé à cet abonnement';
    logger.warn('[Subscription Sync] Utilisateur manquant', {
      subscriptionId: subscription.subscriptionId ?? subscription.id,
      reason,
    });

    await enqueueMissingUserRetry(payload, subscription, null, reason);
    return;
  }

  const normalizedStatus = normalizeStatus(subscription.status);
  const subscriptionEndDate = normalizeDate(subscription.currentPeriodEnd);

  const userExists = await doesUserExist(payload, userId);

  if (!userExists) {
    const reason = 'Utilisateur introuvable lors de la synchronisation';
    logger.warn('[Subscription Sync] Utilisateur introuvable', {
      userId,
      subscriptionId: subscription.subscriptionId ?? subscription.id,
    });

    await enqueueMissingUserRetry(payload, subscription, userId, reason);
    return;
  }

  try {
    await payload.update({
      collection: 'users',
      id: userId,
      data: {
        // Utiliser les noms de champs exacts
        subscriptionStatus: normalizedStatus as 'none' | 'trialing' | 'active' | 'past_due' | 'canceled',
        subscriptionEndDate: subscriptionEndDate?.toISOString() ?? null,
      },
    });

    logger.debug('[Subscription Sync] Synchronisation réussie', {
      userId,
      subscriptionId: subscription.subscriptionId ?? subscription.id,
      subscriptionStatus: normalizedStatus,
      subscriptionEndDate: subscriptionEndDate?.toISOString() ?? null,
    });
  } catch (error) {
    logger.error('[Subscription Sync] Échec de mise à jour utilisateur', error, {
      userId,
      subscriptionId: subscription.subscriptionId ?? subscription.id,
    });

    throw error;
  }
}

function extractUserId(userField: SubscriptionDoc['user']): NullableId {
  if (!userField) return null;

  if (typeof userField === 'string' || typeof userField === 'number') {
    return userField;
  }

  if (typeof userField === 'object' && 'id' in userField && userField.id) {
    const value = userField.id;

    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }
  }

  return null;
}

function normalizeStatus(status: SubscriptionDoc['status']): string {
  if (typeof status === 'string' && VALID_STATUSES.has(status)) {
    return status;
  }

  return 'none';
}

function normalizeDate(date: SubscriptionDoc['currentPeriodEnd']): Date | null {
  if (!date) return null;

  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof date === 'string') {
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

async function doesUserExist(payload: Payload, userId: string | number): Promise<boolean> {
  try {
    await payload.findByID({
      collection: 'users',
      id: userId,
      depth: 0,
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const notFound = message.toLowerCase().includes('could not be found');

    if (!notFound) {
      logger.error('[Subscription Sync] Erreur lors de la vérification utilisateur', error, {
        userId,
      });

      throw error;
    }

    return false;
  }
}

async function enqueueMissingUserRetry(
  payload: Payload,
  subscription: SubscriptionDoc,
  userId: NullableId,
  reason: string,
): Promise<void> {
  const latestEvent = Array.isArray(subscription.history) && subscription.history.length > 0
    ? subscription.history[subscription.history.length - 1]
    : undefined;

  const lastRaw = (latestEvent?.raw && typeof latestEvent.raw === 'object' && latestEvent.raw !== null)
    ? latestEvent.raw
    : {};

  const subscriptionId = subscription.subscriptionId ?? subscription.id;
  const baseEventId = typeof (lastRaw as { id?: unknown }).id === 'string'
    ? (lastRaw as { id: string }).id
    : String(subscriptionId);

  const eventId = `subscription-sync-missing-user-${baseEventId}`;
  const eventType = latestEvent?.type ?? 'subscription_sync.missing_user';
  const nextRetryAt = new Date(Date.now() + RETRY_DELAY_MS);
  const nextRetryAtISO = nextRetryAt.toISOString();

  const queuePayload: QueuePayload = {
    ...lastRaw,
    subscriptionId,
    userId: userId ?? null,
    reason,
    source: 'syncUserSubscription',
  };

  try {
    const existingEntry = await payload.find({
      collection: WEBHOOK_RETRY_QUEUE_COLLECTION,
      where: {
        eventId: { equals: eventId },
      },
      limit: 1,
    });

    if (existingEntry.docs.length > 0) {
      const [entry] = existingEntry.docs as WebhookRetryQueueDoc[];

      if (!entry) {
        return;
      }

      await payload.update({
        collection: WEBHOOK_RETRY_QUEUE_COLLECTION,
        id: entry.id,
        data: {
          status: 'pending',
          nextRetryAt: nextRetryAtISO,
          lastError: reason,
          payload: entry.payload ?? queuePayload,
        },
      });
    } else {
      await payload.create({
        collection: WEBHOOK_RETRY_QUEUE_COLLECTION,
        data: {
          eventId,
          eventType,
          payload: queuePayload,
          retryCount: 0,
          maxRetries: 3,
          lastError: reason,
          status: 'pending',
          nextRetryAt: nextRetryAtISO,
        },
      });
    }

    logger.info('[Subscription Sync] Abonnement ajouté à la file de réessai', {
      eventId,
      eventType,
      subscriptionId,
      userId,
    });
  } catch (error) {
    logger.error('[Subscription Sync] Impossible d\'ajouter à la file de réessai', error, {
      subscriptionId,
      userId,
    });
  }
}
