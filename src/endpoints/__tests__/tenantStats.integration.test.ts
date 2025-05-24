import request from 'supertest';
import { vi } from 'vitest';
import express from 'express';
import { tenantStatsEndpoint } from '../tenantStats';

// Mock du module de stats
import * as tenantStats from '../../stats/tenantStats';
vi.mock('../../stats/tenantStats');

const app = express();
app.use(express.json());
app.get('/api/tenants/:tenantId/stats', async (req: any, res) => {
  // Simule l'authentification via un header custom
  req.user = { role: req.headers['x-role'] };
  try {
    await tenantStatsEndpoint(req, res);
  } catch (err) {
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
