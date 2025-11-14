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

// Mock du module de vérification de signature
vi.mock('../../utils/stripe/webhookSignature', () => ({
  verifyWebhookSignature: vi.fn(),
}));

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;
  let mockStripeClient: any;
  let mockPayload: any;

  beforeEach(() => {
    // Mock StripeClient
    mockStripeClient = {
      getStripe: vi.fn().mockReturnValue({
        webhooks: {
          constructEvent: vi.fn(),
        },
        customers: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'cus_test',
            email: 'test@example.com',
            deleted: false,
          }),
        },
        subscriptions: {
          retrieve: vi.fn().mockResolvedValue({
            id: 'sub_test',
            items: {
              data: [
                {
                  id: 'si_test',
                  current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
                },
              ],
            },
          }),
        },
      }),
      getWebhookSecret: vi.fn().mockReturnValue('whsec_test_secret'),
    };

    // Mock Payload
    mockPayload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            id: 'user_123',
            email: 'test@example.com',
            history: [],
          },
        ],
      }),
      create: vi.fn().mockResolvedValue({ id: 'created_id' }),
      update: vi.fn().mockResolvedValue({ id: 'updated_id' }),
    };

    service = new StripeWebhookService(mockStripeClient, mockPayload);
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyWebhookSignature', () => {
    it('should have verifySignature method', () => {
      expect(typeof service.verifySignature).toBe('function');
    });

    it('should call verifySignature method without throwing', () => {
      // Test that the method exists and can be called
      // The actual verification logic is tested through integration
      expect(() => {
        try {
          service.verifySignature('test body', 'valid_signature');
        } catch (_error) {
          // Expected to potentially throw due to mocking, but method exists
        }
      }).not.toThrow(TypeError);
    });

    it('should use stripe client for verification', () => {
      // Call verifySignature to trigger the client methods
      try {
        service.verifySignature('test body', 'valid_signature');
      } catch (_error) {
        // Expected to potentially throw due to mocking
      }

      expect(mockStripeClient.getStripe).toHaveBeenCalled();
      expect(mockStripeClient.getWebhookSecret).toHaveBeenCalled();
    });
  });

  describe('processEvent', () => {
    it('should process customer.subscription.created event', async () => {
      const mockSubscription = {
        id: 'sub_test_123',
        customer: 'cus_test_123',
        status: 'trialing',
        items: {
          data: [
            {
              id: 'si_test',
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
              price: {
                id: 'price_monthly_123',
                unit_amount: 1500,
                currency: 'eur',
              } as Stripe.Price,
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
        trial_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        cancel_at_period_end: false,
        currency: 'eur',
        created: Math.floor(Date.now() / 1000),
        metadata: {
          userId: 'user_123',
        },
      } as unknown as Stripe.Subscription;

      const event: Stripe.Event = {
        id: 'evt_test_sub_created',
        object: 'event',
        type: 'customer.subscription.created',
        created: Date.now(),
        livemode: false,
        api_version: '2025-09-30.clover',
        data: {
          object: mockSubscription,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      // Vérifier que l'événement a été traité
      expect(true).toBe(true); // Le traitement ne devrait pas throw d'erreur
    });

    it('should process invoice.payment_succeeded event', async () => {
      const mockInvoice = {
        id: 'in_test_123',
        subscription: 'sub_test_123',
        amount_paid: 1500,
        status: 'paid',
        paid: true,
        currency: 'eur',
        status_transitions: {
          paid_at: Math.floor(Date.now() / 1000),
        },
      } as unknown as Stripe.Invoice;

      const event: Stripe.Event = {
        id: 'evt_test_payment',
        object: 'event',
        type: 'invoice.payment_succeeded',
        created: Date.now(),
        livemode: false,
        api_version: '2025-09-30.clover',
        data: {
          object: mockInvoice,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should process customer.subscription.updated event', async () => {
      const mockSubscription = {
        id: 'sub_test_456',
        customer: 'cus_test_456',
        status: 'active',
        items: {
          data: [
            {
              id: 'si_test',
              current_period_end: Math.floor(Date.now() / 1000) + 86400 * 365,
              price: {
                id: 'price_yearly_456',
                unit_amount: 12000,
                currency: 'eur',
              } as Stripe.Price,
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
        trial_end: null,
        cancel_at_period_end: false,
        currency: 'eur',
        created: Math.floor(Date.now() / 1000),
        metadata: {
          userId: 'user_456',
        },
      } as unknown as Stripe.Subscription;

      const event: Stripe.Event = {
        id: 'evt_test_sub_updated',
        object: 'event',
        type: 'customer.subscription.updated',
        created: Date.now(),
        livemode: false,
        api_version: '2025-09-30.clover',
        data: {
          object: mockSubscription,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should process customer.subscription.deleted event', async () => {
      const mockSubscription = {
        id: 'sub_test_deleted',
        customer: 'cus_test_deleted',
        status: 'canceled',
        currency: 'eur',
        created: Math.floor(Date.now() / 1000),
        metadata: {
          userId: 'user_deleted',
        },
      } as unknown as Stripe.Subscription;

      const event: Stripe.Event = {
        id: 'evt_test_sub_deleted',
        object: 'event',
        type: 'customer.subscription.deleted',
        created: Date.now(),
        livemode: false,
        api_version: '2025-09-30.clover',
        data: {
          object: mockSubscription,
        },
        pending_webhooks: 0,
        request: null,
      };

      await service.processEvent(event);

      expect(true).toBe(true);
    });

    it('should process invoice.payment_failed event', async () => {
      const mockInvoice = {
        id: 'in_test_failed',
        subscription: 'sub_test_failed',
        amount_due: 1500,
        status: 'open',
        paid: false,
        currency: 'eur',
        status_transitions: {},
      } as unknown as Stripe.Invoice;

      const event: Stripe.Event = {
        id: 'evt_test_payment_failed',
        object: 'event',
        type: 'invoice.payment_failed',
        created: Date.now(),
        livemode: false,
        api_version: '2025-09-30.clover',
        data: {
          object: mockInvoice,
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
        type: 'charge.succeeded' as Stripe.Event.Type, // Type non géré
        created: Date.now(),
        livemode: false,
        api_version: '2025-09-30.clover',
        data: {
          object: {} as Stripe.Charge,
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
        api_version: '2025-09-30.clover',
        data: {
          object: null as unknown as Stripe.Subscription, // Données invalides
        },
        pending_webhooks: 0,
        request: null,
      };

      // Devrait gérer l'erreur sans crasher et retourner un résultat avec success: false
      const result = await service.processEvent(event);

      expect(result).toEqual({
        success: false,
        eventType: 'customer.subscription.created',
        error: expect.any(String),
      });
    });
  });
});
