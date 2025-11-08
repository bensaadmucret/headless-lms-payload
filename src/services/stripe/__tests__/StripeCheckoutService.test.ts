import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StripeCheckoutService, type CheckoutSessionRequest } from '../StripeCheckoutService';
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
  let mockStripeClient: any;
  let mockPayload: any;

  beforeEach(() => {
    // Setup mock Stripe instance
    mockStripeInstance = {
      checkout: {
        sessions: {
          create: vi.fn(),
        },
      },
      customers: {
        create: vi.fn(),
      },
    };

    // Mock StripeClient
    mockStripeClient = {
      getStripe: vi.fn().mockReturnValue(mockStripeInstance),
    };

    // Mock Payload
    mockPayload = {
      findByID: vi.fn(),
      update: vi.fn(),
    };

    service = new StripeCheckoutService(mockStripeClient, mockPayload);
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

      const mockCustomer = { id: 'cus_123' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_123' }); // No existing stripe customer

      const request: CheckoutSessionRequest = {
        prospectId: 'prospect_123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        priceId: 'price_monthly_123',
        billingCycle: 'monthly',
        selectedPrice: 69.99,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await service.createCheckoutSession(request);

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price: 'price_monthly_123',
              quantity: 1,
            }),
          ]),
          subscription_data: expect.objectContaining({
            trial_period_days: 30,
            metadata: expect.objectContaining({
              prospectId: 'prospect_123',
            }),
          }),
          success_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel',
          metadata: expect.objectContaining({
            prospectId: 'prospect_123',
            billingCycle: 'monthly',
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

      const mockCustomer = { id: 'cus_456' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_456' });

      const request: CheckoutSessionRequest = {
        prospectId: 'prospect_456',
        email: 'test2@example.com',
        firstName: 'Pat',
        lastName: 'Smith',
        priceId: 'price_yearly_456',
        billingCycle: 'yearly',
        selectedPrice: 699.99,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      };

      const result = await service.createCheckoutSession(request);

      expect(result.sessionId).toBe('cs_test_456');
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: expect.arrayContaining([
            expect.objectContaining({
              price: 'price_yearly_456',
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

      const mockCustomer = { id: 'cus_789' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_789' });

      await service.createCheckoutSession({
        prospectId: 'prospect_789',
        email: 'test3@example.com',
        priceId: 'price_monthly_123',
        billingCycle: 'monthly',
        selectedPrice: 69.99,
        successUrl: 'https://example.com/checkout/success',
        cancelUrl: 'https://example.com/checkout/cancel',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://example.com/checkout/success',
          cancel_url: 'https://example.com/checkout/cancel',
        })
      );
    });

    it('should throw error if Stripe session creation fails', async () => {
      const mockCustomer = { id: 'cus_error' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_error' });

      await expect(
        service.createCheckoutSession({
          prospectId: 'prospect_error',
          email: 'error@example.com',
          priceId: 'price_monthly_123',
          billingCycle: 'monthly',
          selectedPrice: 69.99,
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Failed to create checkout session: Stripe API error');
    });

    it('should include 30 days trial period', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_trial',
        url: 'https://checkout.stripe.com/pay/cs_test_trial',
      };

      const mockCustomer = { id: 'cus_trial' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_trial' });

      await service.createCheckoutSession({
        prospectId: 'prospect_trial',
        email: 'trial@example.com',
        priceId: 'price_monthly_123',
        billingCycle: 'monthly',
        selectedPrice: 69.99,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
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

      const mockCustomer = { id: 'cus_metadata' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_metadata_123' });

      const prospectId = 'prospect_metadata_123';
      await service.createCheckoutSession({
        prospectId,
        email: 'metadata@example.com',
        priceId: 'price_monthly_123',
        billingCycle: 'monthly',
        selectedPrice: 69.99,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            metadata: expect.objectContaining({
              prospectId,
            }),
          }),
        })
      );
    });
  });

  describe('customer management', () => {
    it('should use existing customer if available', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_existing',
        url: 'https://checkout.stripe.com/pay/cs_test_existing',
      };

      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ 
        id: 'prospect_existing', 
        stripeCustomerId: 'cus_existing_123' 
      });

      await service.createCheckoutSession({
        prospectId: 'prospect_existing',
        email: 'existing@example.com',
        priceId: 'price_monthly_123',
        billingCycle: 'monthly',
        selectedPrice: 69.99,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing_123',
        })
      );
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
    });

    it('should create new customer if none exists', async () => {
      const mockSession: Partial<Stripe.Checkout.Session> = {
        id: 'cs_test_new',
        url: 'https://checkout.stripe.com/pay/cs_test_new',
      };

      const mockCustomer = { id: 'cus_new_123' };
      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);
      mockPayload.findByID.mockResolvedValue({ id: 'prospect_new' }); // No stripeCustomerId
      mockPayload.update.mockResolvedValue({});

      await service.createCheckoutSession({
        prospectId: 'prospect_new',
        email: 'new@example.com',
        priceId: 'price_monthly_123',
        billingCycle: 'monthly',
        selectedPrice: 69.99,
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        metadata: expect.objectContaining({
          prospectId: 'prospect_new',
        }),
        name: undefined,
      });
      expect(mockPayload.update).toHaveBeenNthCalledWith(1, {
        collection: 'prospects',
        id: 'prospect_new',
        data: {
          stripeCustomerId: 'cus_new_123',
          status: 'payment_in_progress',
          checkoutSessionId: undefined,
        },
      });

      expect(mockPayload.update).toHaveBeenNthCalledWith(2, {
        collection: 'prospects',
        id: 'prospect_new',
        data: {
          checkoutSessionId: 'cs_test_new',
          status: 'payment_in_progress',
        },
      });
    });
  });
});
