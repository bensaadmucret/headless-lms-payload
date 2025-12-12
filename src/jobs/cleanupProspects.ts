import type { Payload } from 'payload';

/**
 * Nettoie les prospects en statut pending trop anciens en les marquant comme expired.
 */
export async function cleanupProspects(payload: Payload): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48h

  try {
    const result = await (payload as any).find({
      collection: 'prospects',
      where: {
        status: { equals: 'pending' },
        createdAt: { less_than: cutoff.toISOString() },
      },
      limit: 100,
      pagination: false,
    });

    const docs = (result?.docs ?? []) as any[];

    if (!docs.length) {
      return;
    }

    console.log('[ProspectsCleanup] Expiring old pending prospects', {
      count: docs.length,
      cutoff: cutoff.toISOString(),
    });

    for (const doc of docs) {
      try {
        await (payload as any).update({
          collection: 'prospects',
          id: doc.id,
          data: {
            status: 'expired',
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[ProspectsCleanup] Failed to expire prospect', {
          id: doc.id,
          error: message,
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ProspectsCleanup] Failed to query prospects', {
      cutoff: cutoff.toISOString(),
      error: message,
    });
  }
}
