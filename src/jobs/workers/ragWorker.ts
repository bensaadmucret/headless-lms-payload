/**
 * Worker RAG - Traitement asynchrone du pipeline RAG complet
 * Chunking → Embeddings → Vector Storage
 */

import type { Job } from 'bull'
import { chunkingService } from '../services/chunkingService'
import { embeddingService } from '../services/embeddingService'
import { vectorStoreService } from '../services/vectorStoreService'

export interface RAGJobData {
  type: 'rag-processing'
  documentId: string
  extractedText: string
  priority: 'low' | 'normal' | 'high' | 'critical'
  userId: string
  chunkingOptions?: {
    chunkSize?: number
    chunkOverlap?: number
    strategy?: 'standard' | 'chapters' | 'fixed'
  }
  embeddingOptions?: {
    provider?: 'openai' | 'huggingface' | 'local'
    model?: string
  }
}

export interface RAGJobResult {
  success: boolean
  documentId: string
  chunksCount: number
  embeddingDimensions: number
  collectionName: string
  processingTime: number
  error?: string
}

/**
 * Traiter un job RAG complet
 */
export async function processRAGJob(job: Job<RAGJobData>): Promise<RAGJobResult> {
  const startTime = Date.now()
  const { documentId, extractedText, chunkingOptions, embeddingOptions } = job.data

  console.log(`\n🚀 [RAG Worker] Starting RAG processing for document: ${documentId}`)
  console.log(`📊 [RAG Worker] Text length: ${extractedText.length} chars`)

  try {
    // ===== ÉTAPE 1 : CHUNKING =====
    await job.progress(10)
    console.log(`\n📦 [RAG Worker] Step 1/3: Chunking text...`)

    let chunkingResult
    const strategy = chunkingOptions?.strategy || 'standard'

    switch (strategy) {
      case 'chapters':
        chunkingResult = await chunkingService.chunkByChapters(extractedText)
        break
      case 'fixed':
        chunkingResult = await chunkingService.chunkByFixedSize(
          extractedText,
          chunkingOptions?.chunkSize || 1000,
          chunkingOptions?.chunkOverlap || 0
        )
        break
      default:
        chunkingResult = await chunkingService.chunkText(extractedText, {
          chunkSize: chunkingOptions?.chunkSize,
          chunkOverlap: chunkingOptions?.chunkOverlap,
        })
    }

    console.log(`✅ [RAG Worker] Chunking complete: ${chunkingResult.totalChunks} chunks`)
    await job.progress(40)

    // ===== ÉTAPE 2 : EMBEDDINGS =====
    console.log(`\n🧠 [RAG Worker] Step 2/3: Generating embeddings...`)

    const embeddingResult = await embeddingService.generateEmbeddings(
      chunkingResult.chunks,
      embeddingOptions
    )

    console.log(`✅ [RAG Worker] Embeddings complete: ${embeddingResult.embeddings.length} vectors`)
    console.log(`📊 [RAG Worker] Dimensions: ${embeddingResult.dimensions}`)
    console.log(`⚡ [RAG Worker] Provider: ${embeddingResult.provider} (${embeddingResult.model})`)
    await job.progress(70)

    // ===== ÉTAPE 3 : VECTOR STORAGE =====
    console.log(`\n💾 [RAG Worker] Step 3/3: Storing in vector database...`)

    const storageResult = await vectorStoreService.storeChunks(
      documentId,
      chunkingResult.chunks,
      embeddingResult.embeddings
    )

    console.log(`✅ [RAG Worker] Storage complete: ${storageResult.storedCount} chunks stored`)
    await job.progress(100)

    // ===== RÉSULTAT FINAL =====
    const processingTime = Date.now() - startTime

    console.log(`\n🎉 [RAG Worker] RAG processing completed successfully!`)
    console.log(`⏱️ [RAG Worker] Total processing time: ${processingTime}ms`)
    console.log(`📊 [RAG Worker] Summary:`)
    console.log(`   - Chunks: ${chunkingResult.totalChunks}`)
    console.log(`   - Embeddings: ${embeddingResult.embeddings.length}`)
    console.log(`   - Dimensions: ${embeddingResult.dimensions}`)
    console.log(`   - Collection: ${storageResult.collectionName}`)

    return {
      success: true,
      documentId,
      chunksCount: chunkingResult.totalChunks,
      embeddingDimensions: embeddingResult.dimensions,
      collectionName: storageResult.collectionName,
      processingTime,
    }
  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error(`\n❌ [RAG Worker] RAG processing failed:`, errorMessage)
    console.error(`⏱️ [RAG Worker] Failed after: ${processingTime}ms`)

    return {
      success: false,
      documentId,
      chunksCount: 0,
      embeddingDimensions: 0,
      collectionName: '',
      processingTime,
      error: errorMessage,
    }
  }
}

/**
 * Rechercher dans un document avec RAG
 */
export async function searchInDocument(
  documentId: string,
  query: string,
  options?: {
    topK?: number
    minScore?: number
    embeddingProvider?: 'openai' | 'huggingface' | 'local'
  }
): Promise<{
  success: boolean
  results: Array<{
    content: string
    score: number
    chunkIndex: number
  }>
  error?: string
}> {
  console.log(`\n🔍 [RAG Search] Searching in document: ${documentId}`)
  console.log(`🔍 [RAG Search] Query: "${query}"`)

  try {
    // Générer l'embedding de la requête
    const queryEmbedding = await embeddingService.generateQueryEmbedding(query, {
      provider: options?.embeddingProvider,
    })

    // Rechercher dans le vector store
    const searchResults = await vectorStoreService.searchSimilar(
      queryEmbedding,
      documentId,
      {
        topK: options?.topK || 5,
        minScore: options?.minScore || 0.5,
      }
    )

    console.log(`✅ [RAG Search] Found ${searchResults.length} relevant chunks`)

    return {
      success: true,
      results: searchResults.map(result => ({
        content: result.chunk.content,
        score: result.score,
        chunkIndex: result.chunk.index,
      })),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ [RAG Search] Search failed:`, errorMessage)

    return {
      success: false,
      results: [],
      error: errorMessage,
    }
  }
}

/**
 * Supprimer les données RAG d'un document
 */
export async function deleteDocumentRAG(documentId: string): Promise<{
  success: boolean
  error?: string
}> {
  console.log(`🗑️ [RAG Delete] Deleting RAG data for document: ${documentId}`)

  try {
    await vectorStoreService.deleteCollection(documentId)
    console.log(`✅ [RAG Delete] RAG data deleted successfully`)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ [RAG Delete] Delete failed:`, errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Obtenir les statistiques RAG d'un document
 */
export async function getDocumentRAGStats(documentId: string): Promise<{
  success: boolean
  stats?: {
    collectionName: string
    chunksCount: number
    exists: boolean
  }
  error?: string
}> {
  try {
    const stats = await vectorStoreService.getCollectionStats(documentId)

    return {
      success: true,
      stats: {
        collectionName: stats.name,
        chunksCount: stats.count,
        exists: stats.exists,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      error: errorMessage,
    }
  }
}
