import { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionConfig, CollectionSlug } from 'payload';

const AUDIT_COLLECTION: CollectionConfig['slug'] = 'auditlogs' as const;

// Liste des slugs de collection valides
const VALID_COLLECTIONS = ['users', 'media', 'auditlogs', 'color-schemes'] as const;
type ValidCollection = typeof VALID_COLLECTIONS[number];

// Fonction utilitaire pour vérifier si un slug est valide
const isValidCollectionSlug = (slug: string | undefined): slug is ValidCollection => {
  return slug !== undefined && VALID_COLLECTIONS.includes(slug as ValidCollection);
};

type AuditData = {
  user: { relationTo: 'users'; value: number };
  action: 'create' | 'update' | 'delete';
  collection: ValidCollection;
  documentId: string | number;
  diff?: {
    before: Record<string, any>;
    after: Record<string, any> | null;
  };
  timestamp: Date;
};

/**
 * Hook générique pour journaliser toutes les actions importantes dans la collection AuditLogs.
 * Enregistre : user, action (create/update/delete), collection, documentId, diff, timestamp.
 */
export const logAuditAfterChange: CollectionAfterChangeHook = async ({ req, doc, previousDoc, operation, collection }) => {
  try {
    // On ne log pas les logs eux-mêmes pour éviter la boucle
    if (!req.user?.id || collection?.slug === AUDIT_COLLECTION) return;
    if (!collection?.slug || !isValidCollectionSlug(collection.slug)) return;

    const auditData: AuditData = {
      user: { relationTo: 'users', value: req.user.id },
      action: operation as 'create' | 'update',
      collection: collection.slug,
      documentId: doc.id,
      diff: previousDoc ? { before: previousDoc, after: doc } : undefined,
      timestamp: new Date()
    };

    await req.payload.create({
      collection: AUDIT_COLLECTION as CollectionSlug,
      data: auditData
    });
  } catch (e) {
    // Ne jamais bloquer l'opération principale si le log échoue
    console.error('Erreur logAuditAfterChange:', e);
  }
};

export const logAuditAfterDelete: CollectionAfterDeleteHook = async ({ req, id, doc, collection }) => {
  try {
    if (!req.user?.id || collection?.slug === AUDIT_COLLECTION) return;
    if (!collection?.slug || !isValidCollectionSlug(collection.slug)) return;

    const auditData: AuditData = {
      user: { relationTo: 'users', value: req.user.id },
      action: 'delete',
      collection: collection.slug,
      documentId: id,
      diff: { before: doc, after: null },
      timestamp: new Date()
    };

    await req.payload.create({
      collection: AUDIT_COLLECTION as CollectionSlug,
      data: auditData
    });
  } catch (e) {
    console.error('Erreur logAuditAfterDelete:', e);
  }
};
