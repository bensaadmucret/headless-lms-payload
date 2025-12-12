import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCheckoutSessionEndpoint } from '../stripe/checkout-session';

// Mocks des services Stripe utilisés par l'endpoint
const mockStripeInstance = {
  customers: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
};

vi.mock('../../services/stripe/config', () => ({
  loadStripeConfig: vi.fn(() => ({
    secretKey: 'sk_test_123',
    webhookSecret: 'whsec_test',
    priceIdMonthly: 'price_monthly_test',
    priceIdYearly: 'price_yearly_test',
    frontendUrl: 'http://localhost:5173',
  })),
}));

vi.mock('../../services/stripe/startup', () => ({
  getStripeClient: vi.fn(() => ({
    getStripe: () => mockStripeInstance,
  })),
}));

const readJsonResponse = async (res: Response) => {
  const data = await res.json();
  return { status: res.status, data };
};

describe('/api/stripe/checkout-session (flux prospect)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer une session checkout pour un prospect valide', async () => {
    const body = {
      prospectId: 'prospect_1',
      billingCycle: 'monthly' as const,
      selectedPrice: 69.99,
      email: 'lead@example.com',
      firstName: 'Lead',
      lastName: 'Test',
      year: 'pass',
      examDate: '2025-06-01',
      studyHoursPerWeek: 20,
      campaign: {
        utm_source: 'google',
      },
    };

    const payload = {
      findByID: vi.fn().mockResolvedValue({
        id: 'prospect_1',
        email: 'lead@example.com',
        firstName: 'Lead',
        lastName: 'Test',
        role: 'student',
      }),
      update: vi.fn(),
    } as any;

    const session = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    };

    (mockStripeInstance.customers.create as any).mockResolvedValue({ id: 'cus_test_123' });
    (mockStripeInstance.checkout.sessions.create as any).mockResolvedValue(session);

    const req: any = {
      json: vi.fn().mockResolvedValue(body),
      payload,
    };

    const res = await createCheckoutSessionEndpoint.handler(req);
    const { status, data } = await readJsonResponse(res);

    expect(status).toBe(200);
    expect(data.sessionId).toBe('cs_test_123');
    expect(data.url).toBe(session.url);

    expect(payload.findByID).toHaveBeenCalledWith({
      collection: 'prospects',
      id: 'prospect_1',
    });

    expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
      email: 'lead@example.com',
      name: 'Lead Test',
      metadata: {
        prospectId: 'prospect_1',
      },
    });

    expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({
          metadata: expect.objectContaining({
            prospectId: 'prospect_1',
            year: 'pass',
            examDate: '2025-06-01',
            studyHoursPerWeek: '20',
            onboardingComplete: 'true', // Vérifie que l'onboarding est marqué comme complet car year + examDate présents
          }),
        }),
      })
    );

    expect(payload.update).toHaveBeenCalledWith({
      collection: 'prospects',
      id: 'prospect_1',
      data: {
        stripeCustomerId: 'cus_test_123',
      },
    });
    expect(payload.update).toHaveBeenCalledWith({
      collection: 'prospects',
      id: 'prospect_1',
      data: {
        stripeCheckoutSessionId: 'cs_test_123',
      },
    });
  });

  it('devrait retourner 404 si le prospect est introuvable ou email incohérent', async () => {
    const body = {
      prospectId: 'prospect_missing',
      billingCycle: 'monthly' as const,
      selectedPrice: 69.99,
      email: 'lead@example.com',
    };

    const payload = {
      findByID: vi.fn().mockResolvedValue({
        id: 'prospect_missing',
        email: 'different@example.com',
      }),
      update: vi.fn(),
    } as any;

    const req: any = {
      json: vi.fn().mockResolvedValue(body),
      payload,
    };

    const res = await createCheckoutSessionEndpoint.handler(req);
    const { status, data } = await readJsonResponse(res);

    expect(status).toBe(404);
    expect(data.error).toBe('Not Found');
    expect(data.message).toContain('Prospect introuvable');
  });

  it('devrait retourner 400 si des champs requis sont manquants', async () => {
    const body = {
      prospectId: 'prospect_1',
      // email manquant, billingCycle invalide, selectedPrice non numérique
      billingCycle: 'invalid',
      selectedPrice: NaN,
    } as any;

    const payload = {
      findByID: vi.fn(),
      update: vi.fn(),
    } as any;

    const req: any = {
      json: vi.fn().mockResolvedValue(body),
      payload,
    };

    const res = await createCheckoutSessionEndpoint.handler(req);
    const { status, data } = await readJsonResponse(res);

    expect(status).toBe(400);
    expect(data.error).toBe('Bad Request');
  });
});
