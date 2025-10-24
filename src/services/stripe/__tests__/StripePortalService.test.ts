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
    mockStripeInstance = {
      billingPortal: {
        sessions: {
          create: vi.fn(),
        },
      },
    };
    service = new StripePortalService(mockStripeInstance);
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

      const result = await service.createPortalSession('cus_test_123', 'http://localhost:5173/account');

      expect(result).toBe('https://billing.stripe.com/session/test_123');

      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: 'http://localhost:5173/account',
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

      await service.createPortalSession('cus_test_456', 'http://localhost:5173/account/subscription');

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

      await expect(service.createPortalSession('invalid_customer', 'http://localhost:5173/account')).rejects.toThrow(
        'Échec de création de session portail: No such customer'
      );
    });

    it('should throw error if Stripe API fails', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(service.createPortalSession('cus_test', 'http://localhost:5173/account')).rejects.toThrow(
        'Échec de création de session portail: Stripe API error'
      );
    });

    it('should handle empty customer ID', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Customer ID is required')
      );
      await expect(service.createPortalSession('', 'http://localhost:5173/account')).rejects.toThrow();
    });

    it('should handle null customer ID', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Customer ID is required')
      );
      await expect(service.createPortalSession(null as any, 'http://localhost:5173/account')).rejects.toThrow();
    });
  });

  describe('configuration', () => {
    it('should work with different return URLs', async () => {
      const mockPortalSession: Partial<Stripe.BillingPortal.Session> = {
        id: 'bps_test_config',
        url: 'https://billing.stripe.com/session/test_config',
        customer: 'cus_test_config',
      };

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue(
        mockPortalSession
      );

      const customReturnUrl = 'https://app.example.com/dashboard';
      await service.createPortalSession('cus_test_config', customReturnUrl);

      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_config',
        return_url: customReturnUrl,
      });
    });

    it('should handle production URLs', async () => {
      const mockPortalSession: Partial<Stripe.BillingPortal.Session> = {
        id: 'bps_test_prod',
        url: 'https://billing.stripe.com/session/test_prod',
        customer: 'cus_test_prod',
      };

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue(
        mockPortalSession
      );

      const prodUrl = 'https://app.example.com/account/subscription';
      const result = await service.createPortalSession('cus_test_prod', prodUrl);

      expect(result).toBe('https://billing.stripe.com/session/test_prod');
      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_prod',
        return_url: prodUrl,
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Network error')
      );

      await expect(service.createPortalSession('cus_test', 'http://localhost:5173/account')).rejects.toThrow(
        'Échec de création de session portail: Network error'
      );
    });

    it('should handle rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).type = 'StripeRateLimitError';

      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        rateLimitError
      );

      await expect(service.createPortalSession('cus_test', 'http://localhost:5173/account')).rejects.toThrow(
        'Échec de création de session portail: Rate limit exceeded'
      );
    });
  });
});
