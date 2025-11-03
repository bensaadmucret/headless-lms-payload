import type { CollectionSlug, Payload } from 'payload';

type DocumentIdentifier = string | number;

type DocumentWithId = {
  id: DocumentIdentifier;
};

/**
 * Utilitaire pour charger des documents en batch et éviter les requêtes N+1
 * 
 * @example
 * ```typescript
 * const loader = new BatchLoader(payload);
 * 
 * // Charger plusieurs catégories en une seule requête
 * const categories = await loader.loadMany('categories', [1, 2, 3, 4]);
 * 
 * // Avec depth pour peupler les relations
 * const questions = await loader.loadMany('questions', questionIds, { depth: 2 });
 * ```
 */
export class BatchLoader {
  private payload: Payload;
  private cache: Map<string, Map<DocumentIdentifier, unknown>>;

  constructor(payload: Payload) {
    this.payload = payload;
    this.cache = new Map();
  }

  /**
   * Charge plusieurs documents d'une collection en une seule requête
   * 
   * @param collection Nom de la collection
   * @param ids Liste des IDs à charger
   * @param options Options supplémentaires (depth, etc.)
   * @returns Map des documents chargés (key = id, value = document)
   */
  async loadMany<T = Record<string, unknown>>(
    collection: CollectionSlug | string,
    ids: DocumentIdentifier[],
    options: { depth?: number; useCache?: boolean } = {}
  ): Promise<Map<string | number, T>> {
    const { depth = 0, useCache = true } = options;
    const cacheKey = `${collection}-depth${depth}`;
    
    // Initialiser le cache pour cette collection si nécessaire
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, new Map());
    }
    
    const collectionCache = this.cache.get(cacheKey)!;
    const result = new Map<string | number, T>();
    const idsToFetch: DocumentIdentifier[] = [];

    // Vérifier le cache
    for (const id of ids) {
      if (useCache && collectionCache.has(id)) {
        result.set(id, collectionCache.get(id) as T);
      } else {
        idsToFetch.push(id);
      }
    }

    // Si tous les documents sont en cache, retourner directement
    if (idsToFetch.length === 0) {
      return result;
    }

    try {
      // Charger les documents manquants en une seule requête
      const response = await this.payload.find<T>({
        collection: collection as CollectionSlug,
        where: {
          id: {
            in: idsToFetch
          }
        },
        depth,
        limit: idsToFetch.length,
        pagination: false
      });

      // Stocker dans le cache et le résultat
      for (const doc of response.docs) {
        const docId = extractDocumentId(doc);
        result.set(docId, doc as T);
        if (useCache) {
          collectionCache.set(docId, doc);
        }
      }

      return result;
    } catch (error) {
      console.error(`[BatchLoader] Erreur lors du chargement de ${collection}:`, error);
      return result;
    }
  }

  /**
   * Charge un seul document (utilise le cache si disponible)
   * 
   * @param collection Nom de la collection
   * @param id ID du document
   * @param options Options supplémentaires
   * @returns Le document ou null si non trouvé
   */
  async loadOne<T = Record<string, unknown>>(
    collection: CollectionSlug | string,
    id: DocumentIdentifier,
    options: { depth?: number; useCache?: boolean } = {}
  ): Promise<T | null> {
    const result = await this.loadMany<T>(collection, [id], options);
    return result.get(id) || null;
  }

  /**
   * Précharge des documents pour optimiser les requêtes futures
   * Utile quand on sait qu'on va avoir besoin de plusieurs documents
   * 
   * @param collection Nom de la collection
   * @param ids Liste des IDs à précharger
   * @param options Options supplémentaires
   */
  async preload(
    collection: CollectionSlug | string,
    ids: DocumentIdentifier[],
    options: { depth?: number } = {}
  ): Promise<void> {
    await this.loadMany(collection, ids, { ...options, useCache: true });
  }

  /**
   * Vide le cache pour une collection spécifique ou tout le cache
   * 
   * @param collection Nom de la collection (optionnel)
   */
  clearCache(collection?: string): void {
    if (collection) {
      // Vider le cache pour toutes les profondeurs de cette collection
      for (const key of this.cache.keys()) {
        if (key.startsWith(collection)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Enrichit une liste de documents avec leurs relations
   * Évite les requêtes N+1 en chargeant toutes les relations en batch
   * 
   * @example
   * ```typescript
   * const questions = await payload.find({ collection: 'questions' });
   * const enriched = await loader.enrichRelations(
   *   questions.docs,
   *   { category: 'categories' }
   * );
   * ```
   */
  async enrichRelations<T extends Record<string, unknown>>(
    documents: T[],
    relations: Record<string, CollectionSlug | string>
  ): Promise<T[]> {
    // Collecter tous les IDs de relations
    const relationIds = new Map<string, Set<DocumentIdentifier>>();

    for (const [field, collection] of Object.entries(relations)) {
      relationIds.set(collection, new Set());

      for (const doc of documents) {
        const value = doc[field];
        if (value) {
          if (typeof value === 'string' || typeof value === 'number') {
            relationIds.get(collection)!.add(value);
          } else if (typeof value === 'object' && value !== null && 'id' in value) {
            const relationId = (value as DocumentWithId).id;
            relationIds.get(collection)!.add(relationId);
          }
        }
      }
    }

    // Charger toutes les relations en batch
    const loadedRelations = new Map<string, Map<DocumentIdentifier, unknown>>();

    for (const [collection, ids] of relationIds.entries()) {
      if (ids.size > 0) {
        const loaded = await this.loadMany(collection, Array.from(ids));
        loadedRelations.set(collection, loaded);
      }
    }

    // Enrichir les documents
    return documents.map(doc => {
      const enriched = { ...doc } as Record<string, unknown>;

      for (const [field, collection] of Object.entries(relations)) {
        const value = doc[field];
        if (value && loadedRelations.has(collection)) {
          const idValue = typeof value === 'object' && value !== null && 'id' in value
            ? (value as DocumentWithId).id
            : value;
          const related = loadedRelations.get(collection)!.get(idValue as DocumentIdentifier);
          if (related) {
            enriched[field] = related;
          }
        }
      }

      return enriched as T;
    });
  }
}

/**
 * Fonction helper pour créer un BatchLoader
 */
export function createBatchLoader(payload: Payload): BatchLoader {
  return new BatchLoader(payload);
}
