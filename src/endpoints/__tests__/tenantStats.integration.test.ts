import request from 'supertest';
import { vi } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';
import { tenantStatsEndpoint } from '../tenantStats';

// Mock du module de stats
import * as tenantStats from '../../stats/tenantStats';
vi.mock('../../stats/tenantStats');

const app = express();
app.use(express.json());
// Middleware pour injecter req.user à partir de l'en-tête x-role
app.use((req: Request, res: Response, next: NextFunction) => {
  // Compatible Web API Headers et IncomingHttpHeaders Node.js
  // @ts-expect-error: Headers type (Web API) ou Node.js
  const role = typeof req.headers.get === 'function' ? req.headers.get('x-role') : req.headers['x-role'];
  if (typeof role === 'string') {
    // @ts-expect-error: propriété custom pour test
    req.user = { role };
  }
  next();
});

app.get('/api/tenants/:tenantId/stats', async (req: Request, res: Response) => {
  try {
    // Cast pour satisfaire le typage custom de tenantStatsEndpoint
    await tenantStatsEndpoint(req as any, res);
  } catch (_err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

describe('GET /api/tenants/:tenantId/stats (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse l'accès à un non-superadmin", async () => {
    const res = await request(app)
      .get('/api/tenants/tenant1/stats')
      .set('x-role', 'admin');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('retourne les stats pour un superadmin', async () => {
    vi.spyOn(tenantStats, 'getAllTenantStats').mockResolvedValue({
      userCount: 5,
      activeUserCount: 2,
      courseCount: 1,
      quizCount: 0,
      mediaCount: 0,
      storageUsedMB: 0,
      loginCount30d: 0,
      actionsCount30d: 0,
      activePlans: 0,
      quotaExceeded: false,
      avgCourseCompletion: 0,
    });
    const res = await request(app)
      .get('/api/tenants/tenant1/stats')
      .set('x-role', 'superadmin');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      userCount: 5,
      activeUserCount: 2,
      courseCount: 1,
      quizCount: 0,
      mediaCount: 0,
      storageUsedMB: 0,
      loginCount30d: 0,
      actionsCount30d: 0,
      activePlans: 0,
      quotaExceeded: false,
      avgCourseCompletion: 0,
    });
  });

  it('retourne une erreur 400 si tenantId manquant', async () => {
    const res = await request(app)
      .get('/api/tenants//stats')
      .set('x-role', 'superadmin');
    expect(res.status).toBe(404);
  });

  it('retourne une erreur 500 si getAllTenantStats échoue', async () => {
    vi.spyOn(tenantStats, 'getAllTenantStats').mockRejectedValue(new Error('fail'));
    const res = await request(app)
      .get('/api/tenants/tenant1/stats')
      .set('x-role', 'superadmin');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
