import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StripeCheckoutService } from '../StripeCheckoutService';
import Stripe from 'stripe';

// Mock de Stripe
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  }));
  return { default: MockStripe };
});

describe('StripeCheckoutService', () => {
  let service: StripeCheckoutService;
  let mockStripeInstance: any;

  beforeEach(() => {
    // Setup mock Stripe instance
    mockStripeInstance = new Stripe('sk_test_mock', { apiVersion: '2024-12-18.acacia' });
    service = new StripeCheckoutService();
    (service as any).stripe = mockStripeInstance;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session with monthly pricing', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
        customer: 'cus_123',
        mode: 'subscription',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSession({
        userId: 'user_123',
        email: 'test@example.com',
        priceId: 'monthly',
      });

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          customer_email: 'test@example.com',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price: expect.any(String),
              quantity: 1,
            }),
          ]),
          subscription_data: expect.objectContaining({
            trial_period_days: 30,
            metadata: expect.objectContaining({
              userId: 'user_123',
            }),
          }),
        })
      );
    });

    it('should create a checkout session with yearly pricing', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456',
        customer: 'cus_456',
        mode: 'subscription',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const result = await service.createCheckoutSession({
        userId: 'user_456',
        email: 'test2@example.com',
        priceId: 'yearly',
      });

      expect(result.sessionId).toBe('cs_test_456');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should include success and cancel URLs', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_789',
        url: 'https://checkout.stripe.com/pay/cs_test_789',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      await service.createCheckoutSession({
        userId: 'user_789',
        email: 'test3@example.com',
        priceId: 'monthly',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('/checkout/success'),
          cancel_url: expect.stringContaining('/checkout/cancel'),
        })
      );
    });

    it('should throw error if Stripe session creation fails', async () => {
      mockStripeInstance.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(
        service.createCheckoutSession({
          userId: 'user_error',
          email: 'error@example.com',
          priceId: 'monthly',
        })
      ).rejects.toThrow('Stripe API error');
    });

    it('should include 30 days trial period', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_trial',
        url: 'https://checkout.stripe.com/pay/cs_test_trial',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      await service.createCheckoutSession({
        userId: 'user_trial',
        email: 'trial@example.com',
        priceId: 'monthly',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 30,
          }),
        })
      );
    });

    it('should include user metadata', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_metadata',
        url: 'https://checkout.stripe.com/pay/cs_test_metadata',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const userId = 'user_metadata_123';
      await service.createCheckoutSession({
        userId,
        email: 'metadata@example.com',
        priceId: 'monthly',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            metadata: expect.objectContaining({
              userId,
            }),
          }),
        })
      );
    });
  });

  describe('getPriceId', () => {
    it('should return monthly price ID for monthly cycle', () => {
      process.env.STRIPE_PRICE_ID_MONTHLY = 'price_monthly_123';
      const priceId = (service as any).getPriceId('monthly');
      expect(priceId).toBe('price_monthly_123');
    });

    it('should return yearly price ID for yearly cycle', () => {
      process.env.STRIPE_PRICE_ID_YEARLY = 'price_yearly_456';
      const priceId = (service as any).getPriceId('yearly');
      expect(priceId).toBe('price_yearly_456');
    });

    it('should throw error if price ID is not configured', () => {
      delete process.env.STRIPE_PRICE_ID_MONTHLY;
      expect(() => (service as any).getPriceId('monthly')).toThrow();
    });
  });
});
