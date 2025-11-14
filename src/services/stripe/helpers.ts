import Stripe from 'stripe';

export type PayloadSubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due';

function findItemWithPeriodBounds(subscription: Stripe.Subscription): Stripe.SubscriptionItem | undefined {
  const items = subscription.items?.data ?? [];

  for (const item of items) {
    if (item && typeof item.current_period_end === 'number') {
      return item;
    }
  }

  return items.find((item): item is Stripe.SubscriptionItem => Boolean(item));
}

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number | undefined {
  const item = findItemWithPeriodBounds(subscription);
  return typeof item?.current_period_end === 'number' ? item.current_period_end : undefined;
}

export function getSubscriptionPeriodStart(subscription: Stripe.Subscription): number | undefined {
  const item = findItemWithPeriodBounds(subscription);
  if (typeof item?.current_period_start === 'number') {
    return item.current_period_start;
  }

  const fallback = (subscription as unknown as { current_period_start?: unknown }).current_period_start;
  return typeof fallback === 'number' ? fallback : undefined;
}

export function getSubscriptionPriceId(subscription: Stripe.Subscription): string | undefined {
  const item = findItemWithPeriodBounds(subscription);
  const priceId = item?.price?.id ?? subscription.items?.data?.[0]?.price?.id;
  return typeof priceId === 'string' ? priceId : undefined;
}

export function stripeTimestampToISOString(
  value?: number | null,
  unit: 'seconds' | 'milliseconds' = 'seconds'
): string | null {
  if (typeof value !== 'number') {
    return null;
  }

  const timestamp = unit === 'seconds' ? value * 1000 : value;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function stripeUnixTimestampToISOString(value?: number | null): string | null {
  return stripeTimestampToISOString(value, 'seconds');
}

export function mapStripeStatus(status: Stripe.Subscription.Status | string): PayloadSubscriptionStatus {
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
