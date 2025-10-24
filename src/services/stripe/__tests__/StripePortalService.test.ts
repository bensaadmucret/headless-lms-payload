import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StripePortalService } from '../StripePortalService';
import Stripe from 'stripe';

// Mock de Stripe
vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
  }));
  return { default: MockStripe };
});

describe('StripePortalService', () => {
  let service: StripePortalService;
  let mockStripeInstance: any;

  beforeEach(() => {
    mockStripeInstance = new Stripe('sk_test_mock', { apiVersion: '2024-12-18.acacia' });
    service = new StripePortalService();
    (service as any).stripe = mockStripeInstance;
    process.env.FRONTEND_URL = 'http://localhost:5173';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createPortalSession', () => {
    it('should create a portal session with valid customer ID', async () => {
      const mockPortalSession: Partial<Stripe.BillingPortal.Session> = {
        id: 'bps_test_123',
        url: 'https://billing.stripe.com/session/test_123',
        customer: 'cus_test_123',
      };

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue(
        mockPortalSession
      );

      const result = await service.createPortalSession('cus_test_123');

      expect(result).toEqual({
        url: 'https://billing.stripe.com/session/test_123',
      });

      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: expect.stringContaining('localhost:5173'),
      });
    });

    it('should use correct return URL', async () => {
      const mockPortalSession: Partial<Stripe.BillingPortal.Session> = {
        id: 'bps_test_456',
        url: 'https://billing.stripe.com/session/test_456',
        customer: 'cus_test_456',
      };

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue(
        mockPortalSession
      );

      await service.createPortalSession('cus_test_456');

      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: expect.stringContaining('account/subscription'),
        })
      );
    });

    it('should throw error if customer ID is invalid', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('No such customer')
      );

      await expect(service.createPortalSession('invalid_customer')).rejects.toThrow(
        'No such customer'
      );
    });

    it('should throw error if Stripe API fails', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(service.createPortalSession('cus_test')).rejects.toThrow(
        'Stripe API error'
      );
    });

    it('should handle empty customer ID', async () => {
      await expect(service.createPortalSession('')).rejects.toThrow();
    });

    it('should handle null customer ID', async () => {
      await expect(service.createPortalSession(null as any)).rejects.toThrow();
    });
  });

  describe('configuration', () => {
    it('should throw error if FRONTEND_URL is not configured', () => {
      delete process.env.FRONTEND_URL;
      const newService = new StripePortalService();

      expect(() =>
        (newService as any).getReturnUrl()
      ).toThrow();
    });

    it('should use production URL in production environment', () => {
      process.env.FRONTEND_URL = 'https://app.example.com';
      const newService = new StripePortalService();

      const returnUrl = (newService as any).getReturnUrl();
      expect(returnUrl).toContain('https://app.example.com');
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Network error')
      );

      await expect(service.createPortalSession('cus_test')).rejects.toThrow(
        'Network error'
      );
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).type = 'StripeRateLimitError';

      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        rateLimitError
      );

      await expect(service.createPortalSession('cus_test')).rejects.toThrow(
        'Rate limit exceeded'
      );
    });
  });
});
