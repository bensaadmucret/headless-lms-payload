// src/endpoints/tenantStats.ts
// Endpoint REST sécurisé pour exposer les stats d'un tenant
import type { Request, Response } from 'express';
import { getAllTenantStats } from '../stats/tenantStats';

// Typage strict pour req.user
interface AuthenticatedRequest extends Request {
  user?: {
    role?: string;
    [key: string]: any;
  };
}

// Middleware de sécurité : accès réservé aux superadmin
export async function tenantStatsEndpoint(req: AuthenticatedRequest, res: Response) {
  try {
    const user = req.user; // user est maintenant typé
    if (!user || user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    const { tenantId } = req.params;
    if (!tenantId) {
      return res.status(400).json({ error: 'Paramètre tenantId manquant' });
    }
    const stats = await getAllTenantStats(tenantId);
    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: 'Erreur serveur', details: error instanceof Error ? error.message : error });
  }
}

// Exemple d'intégration dans payload.config.ts :
// import { tenantStatsEndpoint } from './endpoints/tenantStats';
// endpoints: [
//   {
//     path: '/api/tenants/:tenantId/stats',
//     method: 'get',
//     handler: tenantStatsEndpoint,
//   },
// ],
