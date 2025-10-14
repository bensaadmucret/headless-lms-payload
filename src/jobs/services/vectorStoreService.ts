/**
 * Service de stockage et recherche vectorielle
 * Utilise ChromaDB pour stocker et rechercher les embeddings
 */

import { ChromaClient, Collection } from 'chromadb'
import type { TextChunk } from './chunkingService'

// Types pour ChromaDB
interface ChromaMetadata {
  chunkIndex?: number
  startChar?: number
  endChar?: number
  length?: number
  documentId?: string
  [key: string]: unknown
}

interface ChromaCollection {
  name: string
}

export interface VectorStoreOptions {
  collectionName?: string
  chromaUrl?: string
}

export interface StorageResult {
  collectionName: string
  storedCount: number
  dimensions: number
}

export interface SearchResult {
  chunk: TextChunk
  score: number
  distance: number
}

export interface SearchOptions {
  topK?: number
  minScore?: number
}

/**
 * Service de stockage vectoriel avec ChromaDB
 */
export class VectorStoreService {
  private client: ChromaClient
  private collections: Map<string, Collection> = new Map()
  private chromaUrl: string

  constructor(chromaUrl?: string) {
    this.chromaUrl = chromaUrl || process.env.CHROMA_URL || 'http://localhost:8000'
    this.client = new ChromaClient({ path: this.chromaUrl })
    console.log(`🗄️ [VectorStore] Initialized with ChromaDB at ${this.chromaUrl}`)
  }

  /**
   * Stocker des chunks avec leurs embeddings
   */
  async storeChunks(
    documentId: string,
    chunks: TextChunk[],
    embeddings: number[][],
    options: VectorStoreOptions = {}
  ): Promise<StorageResult> {
    const collectionName = options.collectionName || `doc_${documentId}`
    
    console.log(`💾 [VectorStore] Storing ${chunks.length} chunks in collection: ${collectionName}`)

    try {
      // Créer ou récupérer la collection
      const collection = await this.getOrCreateCollection(collectionName)

      // Préparer les données pour ChromaDB
      const ids = chunks.map((_, index) => `${documentId}_chunk_${index}`)
      const documents = chunks.map(chunk => chunk.content)
      const metadatas = chunks.map(chunk => ({
        documentId,
        chunkIndex: chunk.index,
        startChar: chunk.metadata.startChar,
        endChar: chunk.metadata.endChar,
        length: chunk.metadata.length,
      }))

      // Ajouter à la collection
      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas,
      })

      console.log(`✅ [VectorStore] Stored ${chunks.length} chunks successfully`)

      return {
        collectionName,
        storedCount: chunks.length,
        dimensions: embeddings[0]?.length || 0,
      }
    } catch (error) {
      console.error(`❌ [VectorStore] Storage error:`, error)
      throw new Error(`Vector storage failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Rechercher des chunks similaires à une requête
   */
  async searchSimilar(
    queryEmbedding: number[],
    documentId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const collectionName = `doc_${documentId}`
    const topK = options.topK || 5
    const minScore = options.minScore || 0.0

    console.log(`🔍 [VectorStore] Searching in collection: ${collectionName}`)
    console.log(`🔍 [VectorStore] Top K: ${topK}, Min score: ${minScore}`)

    try {
      const collection = await this.getCollection(collectionName)

      if (!collection) {
        console.warn(`⚠️ [VectorStore] Collection not found: ${collectionName}`)
        return []
      }

      // Effectuer la recherche
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
      })

      // Transformer les résultats
      const searchResults: SearchResult[] = []

      if (results.documents && results.documents[0] && results.distances && results.distances[0] && results.metadatas && results.metadatas[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const document = results.documents[0][i]
          const distance = results.distances[0][i]
          const metadata = results.metadatas[0][i] as ChromaMetadata | null

          // Convertir distance en score (plus la distance est petite, plus le score est élevé)
          const score = 1 / (1 + (distance ?? 0))

          if (score >= minScore) {
            searchResults.push({
              chunk: {
                content: document || '',
                index: metadata?.chunkIndex || 0,
                metadata: {
                  startChar: metadata?.startChar || 0,
                  endChar: metadata?.endChar || 0,
                  length: metadata?.length || 0,
                },
              },
              score,
              distance: distance ?? 0,
            })
          }
        }
      }

      console.log(`✅ [VectorStore] Found ${searchResults.length} similar chunks`)

      return searchResults
    } catch (error) {
      console.error(`❌ [VectorStore] Search error:`, error)
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Rechercher dans toutes les collections
   */
  async searchGlobal(
    queryEmbedding: number[],
    options: SearchOptions = {}
  ): Promise<Map<string, SearchResult[]>> {
    console.log(`🌐 [VectorStore] Global search across all collections`)

    try {
      const collections = await this.client.listCollections()
      const results = new Map<string, SearchResult[]>()

      for (const collectionInfo of collections) {
        const collection = await this.client.getCollection({ name: collectionInfo.name })
        
        const searchResults = await collection.query({
          queryEmbeddings: [queryEmbedding],
          nResults: options.topK || 5,
        })

        const formattedResults: SearchResult[] = []

        if (searchResults.documents && searchResults.documents[0] && searchResults.distances && searchResults.distances[0] && searchResults.metadatas && searchResults.metadatas[0]) {
          for (let i = 0; i < searchResults.documents[0].length; i++) {
            const document = searchResults.documents[0][i]
            const distance = searchResults.distances[0][i]
            const metadata = searchResults.metadatas[0][i] as ChromaMetadata | null
            const score = 1 / (1 + (distance ?? 0))

            if (score >= (options.minScore || 0.0)) {
              formattedResults.push({
                chunk: {
                  content: document || '',
                  index: metadata?.chunkIndex || 0,
                  metadata: {
                    startChar: metadata?.startChar || 0,
                    endChar: metadata?.endChar || 0,
                    length: metadata?.length || 0,
                  },
                },
                score,
                distance: distance ?? 0,
              })
            }
          }
        }

        if (formattedResults.length > 0) {
          results.set(collectionInfo.name, formattedResults)
        }
      }

      console.log(`✅ [VectorStore] Global search found results in ${results.size} collections`)

      return results
    } catch (error) {
      console.error(`❌ [VectorStore] Global search error:`, error)
      throw error
    }
  }

  /**
   * Supprimer une collection (document)
   */
  async deleteCollection(documentId: string): Promise<void> {
    const collectionName = `doc_${documentId}`
    
    console.log(`🗑️ [VectorStore] Deleting collection: ${collectionName}`)

    try {
      await this.client.deleteCollection({ name: collectionName })
      this.collections.delete(collectionName)
      
      console.log(`✅ [VectorStore] Collection deleted: ${collectionName}`)
    } catch (error) {
      console.error(`❌ [VectorStore] Delete error:`, error)
      throw error
    }
  }

  /**
   * Obtenir les statistiques d'une collection
   */
  async getCollectionStats(documentId: string): Promise<{
    name: string
    count: number
    exists: boolean
  }> {
    const collectionName = `doc_${documentId}`

    try {
      const collection = await this.getCollection(collectionName)

      if (!collection) {
        return {
          name: collectionName,
          count: 0,
          exists: false,
        }
      }

      const count = await collection.count()

      return {
        name: collectionName,
        count,
        exists: true,
      }
    } catch {
      return {
        name: collectionName,
        count: 0,
        exists: false,
      }
    }
  }

  /**
   * Lister toutes les collections
   */
  async listCollections(): Promise<string[]> {
    try {
      const collections = await this.client.listCollections()
      return collections.map((c: ChromaCollection) => c.name)
    } catch (error) {
      console.error(`❌ [VectorStore] List collections error:`, error)
      return []
    }
  }

  /**
   * Obtenir ou créer une collection
   */
  private async getOrCreateCollection(name: string): Promise<Collection> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!
    }

    try {
      const collection = await this.client.getOrCreateCollection({
        name,
        metadata: { 'hnsw:space': 'cosine' },
      })

      this.collections.set(name, collection)
      return collection
    } catch (error) {
      console.error(`❌ [VectorStore] Get/Create collection error:`, error)
      throw error
    }
  }

  /**
   * Obtenir une collection existante
   */
  private async getCollection(name: string): Promise<Collection | null> {
    if (this.collections.has(name)) {
      return this.collections.get(name)!
    }

    try {
      const collection = await this.client.getCollection({ name })
      this.collections.set(name, collection)
      return collection
    } catch {
      // Collection n'existe pas
      return null
    }
  }

  /**
   * Vérifier la connexion à ChromaDB
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.heartbeat()
      console.log(`✅ [VectorStore] ChromaDB is healthy`)
      return true
    } catch (error) {
      console.error(`❌ [VectorStore] ChromaDB health check failed:`, error)
      return false
    }
  }
}

// Instance singleton
export const vectorStoreService = new VectorStoreService()
