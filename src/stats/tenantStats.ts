// src/stats/tenantStats.ts
// Module centralisé pour le monitoring/statistiques par tenant
// Toutes les fonctions sont typées, commentées et prêtes à être testées/étendues

import payload from 'payload';

/**
 * Nombre total d'utilisateurs pour un tenant
 */
export async function getUserCountForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'users',
      where: { tenant: { equals: tenantId } },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre d'utilisateurs actifs sur les 30 derniers jours
 * Suppose un champ lastLogin (sinon, à adapter)
 */
export async function getActiveUserCountForTenant(tenantId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await payload.find({
      collection: 'users',
      where: {
        tenant: { equals: tenantId },
        lastLogin: { greater_than: thirtyDaysAgo.toISOString() }
      },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre de cours créés par le tenant
 */
export async function getCourseCountForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'courses',
      where: { tenant: { equals: tenantId } },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre de quizz créés par le tenant
 */
export async function getQuizCountForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'quizzes',
      where: { tenant: { equals: tenantId } },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre de médias/documents associés au tenant
 */
export async function getMediaCountForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'media',
      where: { tenant: { equals: tenantId } },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Volume de stockage utilisé (en Mo)
 * Suppose un champ size (en octets) dans media
 */
export async function getStorageUsedForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'media',
      where: { tenant: { equals: tenantId } },
      pagination: false,
    });
    // Correction : utiliser 'filesize' si défini dans le schéma généré
    const totalBytes = result.docs.reduce((sum, media) => sum + ((media as { filesize?: number }).filesize || 0), 0);
    return Math.round(totalBytes / 1024 / 1024); // en Mo
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre de connexions (logins) sur les 30 derniers jours
 * Suppose un champ lastLogin
 */
export async function getLoginCountForTenant(tenantId: string): Promise<number> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await payload.find({
      collection: 'users',
      where: {
        tenant: { equals: tenantId },
        lastLogin: { greater_than: thirtyDaysAgo.toISOString() }
      },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre d'actions (création, modification, suppression) sur une période
 * Suppose une collection audit avec tenant et createdAt
 */
export async function getActionCountForTenant(tenantId: string, days: number = 30): Promise<number> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const result = await payload.find({
      collection: 'auditlogs',
      where: {
        tenant: { equals: tenantId },
        createdAt: { greater_than: since.toISOString() }
      },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Nombre de plans actifs pour un tenant
 */
export async function getActivePlansForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'subscription-plans',
      where: {
        tenant: { equals: tenantId },
        status: { equals: 'active' }
      },
      pagination: false,
    });
    return result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Dépassement de quota (suppose des champs maxUsers, maxStorageMB sur tenants)
 */
export async function isQuotaExceededForTenant(
  tenantId: string,
  deps = {
    getUserCountForTenant,
    getStorageUsedForTenant,
    findTenantById: (id: string) => payload.findByID({ collection: 'tenant' as any, id })
  }
): Promise<boolean> {
  try {
    const tenant = await deps.findTenantById(tenantId);
    const userCount = await deps.getUserCountForTenant(tenantId);
    const storageUsed = await deps.getStorageUsedForTenant(tenantId);
    return userCount > (tenant.quotas?.maxUsers ?? Infinity) || storageUsed > ((tenant.quotas?.maxStorage ?? Infinity) * 1024);
  } catch (_e) {
    return false;
  }
}

/**
 * Taux de complétion moyen des cours/quizz (suppose une collection progressions)
 */
export async function getAvgCourseCompletionForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'progress',
      where: {
        tenant: { equals: tenantId },
        completed: { exists: true }
      },
      pagination: false,
    });
    if (result.totalDocs === 0) return 0;
    const completed = result.docs.filter(doc => (doc as { completed?: boolean }).completed === true).length;
    return completed / result.totalDocs;
  } catch (_e) {
    return 0;
  }
}

/**
 * Fonction d'agrégation : retourne toutes les stats principales pour un tenant donné
 */
export async function getAllTenantStats(
  tenantId: string,
  deps = {
    getUserCountForTenant,
    getActiveUserCountForTenant,
    getCourseCountForTenant,
    getQuizCountForTenant,
    getMediaCountForTenant,
    getStorageUsedForTenant,
    getLoginCountForTenant,
    getActionCountForTenant,
    getActivePlansForTenant,
    isQuotaExceededForTenant,
    getAvgCourseCompletionForTenant,
  }
) {
  return {
    userCount: await deps.getUserCountForTenant(tenantId),
    activeUserCount: await deps.getActiveUserCountForTenant(tenantId),
    courseCount: await deps.getCourseCountForTenant(tenantId),
    quizCount: await deps.getQuizCountForTenant(tenantId),
    mediaCount: await deps.getMediaCountForTenant(tenantId),
    storageUsedMB: await deps.getStorageUsedForTenant(tenantId),
    loginCount30d: await deps.getLoginCountForTenant(tenantId),
    actionsCount30d: await deps.getActionCountForTenant(tenantId, 30),
    activePlans: await deps.getActivePlansForTenant(tenantId),
    quotaExceeded: await deps.isQuotaExceededForTenant(tenantId),
    avgCourseCompletion: await deps.getAvgCourseCompletionForTenant(tenantId),
  };
}

// À étendre selon les besoins (ajout de métriques, stats historiques, etc.)
