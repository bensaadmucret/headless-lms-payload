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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
  } catch (e) {
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
    const totalBytes = result.docs.reduce((sum, media) => sum + (media.size || 0), 0);
    return Math.round(totalBytes / 1024 / 1024); // en Mo
  } catch (e) {
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
  } catch (e) {
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
      collection: 'audit',
      where: {
        tenant: { equals: tenantId },
        createdAt: { greater_than: since.toISOString() }
      },
      pagination: false,
    });
    return result.totalDocs;
  } catch (e) {
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
  } catch (e) {
    return 0;
  }
}

/**
 * Dépassement de quota (suppose des champs maxUsers, maxStorageMB sur tenants)
 */
export async function isQuotaExceededForTenant(tenantId: string): Promise<boolean> {
  try {
    const tenant = await payload.findByID({
      collection: 'tenants',
      id: tenantId,
    });
    const userCount = await getUserCountForTenant(tenantId);
    const storageUsed = await getStorageUsedForTenant(tenantId);
    return userCount > (tenant.maxUsers || Infinity) || storageUsed > (tenant.maxStorageMB || Infinity);
  } catch (e) {
    return false;
  }
}

/**
 * Taux de complétion moyen des cours/quizz (suppose une collection progressions)
 */
export async function getAvgCourseCompletionForTenant(tenantId: string): Promise<number> {
  try {
    const result = await payload.find({
      collection: 'progressions',
      where: {
        tenant: { equals: tenantId },
        completed: { exists: true }
      },
      pagination: false,
    });
    if (result.totalDocs === 0) return 0;
    const completed = result.docs.filter(doc => doc.completed === true).length;
    return completed / result.totalDocs;
  } catch (e) {
    return 0;
  }
}

/**
 * Fonction d'agrégation : retourne toutes les stats principales pour un tenant donné
 */
export async function getAllTenantStats(tenantId: string) {
  return {
    userCount: await getUserCountForTenant(tenantId),
    activeUserCount: await getActiveUserCountForTenant(tenantId),
    courseCount: await getCourseCountForTenant(tenantId),
    quizCount: await getQuizCountForTenant(tenantId),
    mediaCount: await getMediaCountForTenant(tenantId),
    storageUsedMB: await getStorageUsedForTenant(tenantId),
    loginCount30d: await getLoginCountForTenant(tenantId),
    actionsCount30d: await getActionCountForTenant(tenantId, 30),
    activePlans: await getActivePlansForTenant(tenantId),
    quotaExceeded: await isQuotaExceededForTenant(tenantId),
    avgCourseCompletion: await getAvgCourseCompletionForTenant(tenantId),
  };
}

// À étendre selon les besoins (ajout de métriques, stats historiques, etc.)
