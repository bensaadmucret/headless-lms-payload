import request from 'supertest';
import express from 'express';
import { tenantStatsEndpoint } from '../tenantStats';

// Mock du module de stats
import * as tenantStats from '../../stats/tenantStats';
vi.mock('../../stats/tenantStats');

const app = express();
app.use(express.json());
app.get('/api/tenants/:tenantId/stats', (req, res) => {
  // Simule l'authentification via un header custom
  req.user = { role: req.headers['x-role'] };
  return tenantStatsEndpoint(req, res);
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
    (tenantStats.getAllTenantStats as unknown as jest.Mock).mockResolvedValue({ userCount: 5 });
    const res = await request(app)
      .get('/api/tenants/tenant1/stats')
      .set('x-role', 'superadmin');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userCount: 5 });
  });

  it('retourne une erreur 400 si tenantId manquant', async () => {
    const res = await request(app)
      .get('/api/tenants//stats')
      .set('x-role', 'superadmin');
    expect(res.status).toBe(404);
  });

  it('retourne une erreur 500 si getAllTenantStats échoue', async () => {
    (tenantStats.getAllTenantStats as unknown as jest.Mock).mockRejectedValue(new Error('fail'));
    const res = await request(app)
      .get('/api/tenants/tenant1/stats')
      .set('x-role', 'superadmin');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
