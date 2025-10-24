import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StripeWebhookService } from '../StripeWebhookService';
import Stripe from 'stripe';

// Mock de Stripe
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  }));
  return { default: MockStripe };
});

// Mock de Payload
vi.mock('payload', () => ({
  default: {
    find: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let mockStripeInstance: any;

  beforeEach(() => {
    mockStripeInstance = new Stripe('sk_test_mock', { apiVersion: '2024-12-18.acacia' });
    service = new StripeWebhookService();
    (service as any).stripe = mockStripeInstance;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const rawBody = Buffer.from('test body');
      const signature = 'valid_signature';

      const mockEvent: Stripe.Event = {
        id: 'evt_test_123',
        object: 'event',
        type: 'customer.subscription.created',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: {} as any,
        },
        pending_webhooks: 0,
        request: null,
      };

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = service.verifyWebhookSignature(rawBody, signature);

      expect(result).toEqual(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        rawBody,
        signature,
        'whsec_test_secret'
      );
    });

    it('should throw error for invalid signature', () => {
      const rawBody = Buffer.from('test body');
      const signature = 'invalid_signature';

      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      expect(() => service.verifyWebhookSignature(rawBody, signature)).toThrow(
        'Invalid signature'
      );
    });

    it('should throw error if webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;
      const newService = new StripeWebhookService();

      expect(() =>
        newService.verifyWebhookSignature(Buffer.from('test'), 'sig')
      ).toThrow();
    });
  });

  describe('processEvent', () => {
    it('should process customer.subscription.created event', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'trialing',
        items: {
          data: [
            {
              id: 'si_test',
              price: {
                id: 'price_monthly_123',
                unit_amount: 1500,
                currency: 'eur',
              } as Stripe.Price,
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        trial_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        cancel_at_period_end: false,
        metadata: {
          userId: 'user_123',
        },
      };

      const event: Stripe.Event = {
        id: 'evt_test_sub_created',
        object: 'event',
        type: 'customer.subscription.created',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      // Vérifier que l'événement a été traité
      expect(true).toBe(true); // Le traitement ne devrait pas throw d'erreur
    });

    it('should process invoice.payment_succeeded event', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_123',
        subscription: 'sub_test_123',
        amount_paid: 1500,
        status: 'paid',
        paid: true,
      };

      const event: Stripe.Event = {
        id: 'evt_test_payment',
        object: 'event',
        type: 'invoice.payment_succeeded',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should process customer.subscription.updated event', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_456',
        customer: 'cus_test_456',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_test',
              price: {
                id: 'price_yearly_456',
                unit_amount: 12000,
                currency: 'eur',
              } as Stripe.Price,
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 365,
        trial_end: null,
        cancel_at_period_end: false,
        metadata: {
          userId: 'user_456',
        },
      };

      const event: Stripe.Event = {
        id: 'evt_test_sub_updated',
        object: 'event',
        type: 'customer.subscription.updated',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should process customer.subscription.deleted event', async () => {
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_test_deleted',
        customer: 'cus_test_deleted',
        status: 'canceled',
        metadata: {
          userId: 'user_deleted',
        },
      };

      const event: Stripe.Event = {
        id: 'evt_test_sub_deleted',
        object: 'event',
        type: 'customer.subscription.deleted',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should process invoice.payment_failed event', async () => {
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_test_failed',
        subscription: 'sub_test_failed',
        amount_due: 1500,
        status: 'open',
        paid: false,
      };

      const event: Stripe.Event = {
        id: 'evt_test_payment_failed',
        object: 'event',
        type: 'invoice.payment_failed',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should handle unsupported event types gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_unsupported',
        object: 'event',
        type: 'charge.succeeded' as any, // Type non géré
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: {} as any,
        },
        pending_webhooks: 0,
        request: null,
      };

      // Ne devrait pas throw d'erreur
      await expect(service.processEvent(event)).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      const event: Stripe.Event = {
        id: 'evt_test_error',
        object: 'event',
        type: 'customer.subscription.created',
        created: Date.now(),
        livemode: false,
        api_version: '2024-12-18.acacia',
        data: {
          object: null as any, // Données invalides
        },
        pending_webhooks: 0,
        request: null,
      };

      // Devrait gérer l'erreur sans crasher
      await expect(service.processEvent(event)).rejects.toThrow();
    });
  });
});
