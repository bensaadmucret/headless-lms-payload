import { Payload } from 'payload';

/**
 * Cleanup old webhook retry queue entries
 * Removes entries that are in 'success' or 'failed' status and older than 30 days
 * This prevents the collection from growing indefinitely
 */
export async function cleanupWebhookRetryQueue(payload: Payload): Promise<void> {
  console.log('[Webhook Retry Queue Cleanup] Starting cleanup', {
    timestamp: new Date().toISOString(),
  });

  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find old completed or failed entries
    const oldEntries = await payload.find({
      collection: 'webhook-retry-queue',
      where: {
        and: [
          {
            or: [
              { status: { equals: 'success' } },
              { status: { equals: 'failed' } },
            ],
          },
          { updatedAt: { less_than: thirtyDaysAgo } },
        ],
      },
      limit: 1000, // Process up to 1000 entries per run
    });

    console.log('[Webhook Retry Queue Cleanup] Found old entries', {
      count: oldEntries.docs.length,
      olderThan: thirtyDaysAgo.toISOString(),
    });

    if (oldEntries.docs.length === 0) {
      console.log('[Webhook Retry Queue Cleanup] No entries to clean up');
      return;
    }

    // Delete old entries
    let deletedCount = 0;
    for (const entry of oldEntries.docs) {
      try {
        await payload.delete({
          collection: 'webhook-retry-queue',
          id: entry.id,
        });
        deletedCount++;
      } catch (error) {
        console.error('[Webhook Retry Queue Cleanup] Failed to delete entry', {
          entryId: entry.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[Webhook Retry Queue Cleanup] Cleanup completed', {
      deleted: deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[Webhook Retry Queue Cleanup] Fatal error', {
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
