import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload/types';
import type { User } from '@/payload-types';

/**
 * Hook générique pour journaliser toutes les actions importantes dans la collection AuditLogs.
 * Enregistre : user, action (create/update/delete), collection, documentId, diff, timestamp.
 */
export const logAuditAfterChange: CollectionAfterChangeHook = async ({ req, doc, previousDoc, operation, collection }) => {
  try {
    // On ne log pas les logs eux-mêmes pour éviter la boucle
    if (collection?.slug === 'auditlogs') return;
    await req.payload.create({
      collection: 'auditlogs',
      data: {
        user: req.user?.id,
        action: operation,
        collection: collection?.slug,
        documentId: doc.id,
        diff: previousDoc ? { before: previousDoc, after: doc } : undefined,
        timestamp: new Date()
      }
    });
  } catch (e) {
    // Ne jamais bloquer l'opération principale si le log échoue
    console.error('Erreur logAuditAfterChange:', e);
  }
};

export const logAuditAfterDelete: CollectionAfterDeleteHook = async ({ req, id, doc, collection }) => {
  try {
    if (collection?.slug === 'auditlogs') return;
    await req.payload.create({
      collection: 'auditlogs',
      data: {
        user: req.user?.id,
        action: 'delete',
        collection: collection?.slug,
        documentId: id,
        diff: { before: doc, after: null },
        timestamp: new Date()
      }
    });
  } catch (e) {
    console.error('Erreur logAuditAfterDelete:', e);
  }
};
