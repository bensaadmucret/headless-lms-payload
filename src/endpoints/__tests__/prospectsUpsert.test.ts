import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prospectsUpsertEndpoint } from '../prospectsUpsert';

interface MockPayload {
  find: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  logger?: { error: ReturnType<typeof vi.fn> };
}

const createMockReq = (body: unknown, payloadOverrides?: Partial<MockPayload>): any => {
  const payload: MockPayload = {
    find: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    logger: { error: vi.fn() },
    ...payloadOverrides,
  } as any;

  return {
    json: vi.fn().mockResolvedValue(body),
    payload,
  } as any;
};

const readJsonResponse = async (res: Response) => {
  const data = await res.json();
  return { status: res.status, data };
};

describe('prospectsUpsertEndpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 400 si email, firstName ou lastName sont manquants', async () => {
    const req = createMockReq({ email: 'test@example.com', firstName: 'John' });

    const res = await prospectsUpsertEndpoint.handler(req);
    const { status, data } = await readJsonResponse(res);

    expect(status).toBe(400);
    expect(data.error).toBe('Bad Request');
    expect(data.message).toContain('email, firstName et lastName');
  });

  it('devrait créer un nouveau prospect quand aucun n existe', async () => {
    const body = {
      email: 'lead@example.com',
      firstName: 'Lead',
      lastName: 'Test',
      role: 'student',
      billingCycle: 'monthly' as const,
      selectedPrice: 69.99,
    };

    const req = createMockReq(body, {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      create: vi.fn().mockResolvedValue({
        id: 'prospect_1',
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        billingCycle: body.billingCycle,
        selectedPrice: body.selectedPrice,
        status: 'pending',
      }),
    });

    const res = await prospectsUpsertEndpoint.handler(req);
    const { status, data } = await readJsonResponse(res);

    expect(status).toBe(200);
    expect(req.payload.find).toHaveBeenCalledWith({
      collection: 'prospects',
      where: { email: { equals: body.email } },
      limit: 1,
    });

    expect(req.payload.create).toHaveBeenCalledWith({
      collection: 'prospects',
      data: expect.objectContaining({
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        role: body.role,
        status: 'pending',
      }),
    });

    expect(data.created).toBe(true);
    expect(data.code).toBe('prospect_created');
    expect(data.prospect).toEqual({
      id: 'prospect_1',
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      billingCycle: body.billingCycle,
      selectedPrice: body.selectedPrice,
    });
  });

  it('devrait mettre à jour un prospect existant', async () => {
    const body = {
      email: 'lead@example.com',
      firstName: 'NewLead',
      lastName: 'NewTest',
      role: 'student',
      billingCycle: 'yearly' as const,
      selectedPrice: 699.99,
    };

    const existingDoc = {
      id: 'prospect_existing',
      email: 'lead@example.com',
      firstName: 'Old',
      lastName: 'Name',
      status: 'pending',
    };

    const req = createMockReq(body, {
      find: vi.fn().mockResolvedValue({ docs: [existingDoc] }),
      update: vi.fn().mockResolvedValue({
        id: existingDoc.id,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        billingCycle: body.billingCycle,
        selectedPrice: body.selectedPrice,
        status: 'pending',
      }),
    });

    const res = await prospectsUpsertEndpoint.handler(req);
    const { status, data } = await readJsonResponse(res);

    expect(status).toBe(200);
    expect(req.payload.update).toHaveBeenCalledWith({
      collection: 'prospects',
      id: existingDoc.id,
      data: expect.objectContaining({
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
      }),
    });

    expect(data.created).toBe(false);
    expect(data.code).toBe('prospect_updated');
    expect(data.prospect).toEqual({
      id: existingDoc.id,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      billingCycle: body.billingCycle,
      selectedPrice: body.selectedPrice,
    });
  });
});
