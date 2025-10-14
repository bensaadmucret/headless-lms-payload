/**
 * Service de génération d'embeddings (vecteurs)
 * Supporte plusieurs providers : OpenAI, HuggingFace, Local
 */

import type { TextChunk } from './chunkingService'

export type EmbeddingProvider = 'openai' | 'huggingface' | 'local'

export interface EmbeddingOptions {
  provider?: EmbeddingProvider
  model?: string
  batchSize?: number
}

export interface EmbeddingResult {
  embeddings: number[][]
  dimensions: number
  provider: EmbeddingProvider
  model: string
  processingTime: number
}

/**
 * Service d'embeddings avec support multi-providers
 */
export class EmbeddingService {
  private openaiApiKey?: string
  private huggingfaceApiKey?: string

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.huggingfaceApiKey = process.env.HUGGINGFACE_API_KEY
  }

  /**
   * Générer des embeddings pour une liste de chunks
   */
  async generateEmbeddings(
    chunks: TextChunk[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    const startTime = Date.now()
    const provider = options.provider || this.getDefaultProvider()
    
    console.log(`🧠 [Embeddings] Generating embeddings for ${chunks.length} chunks`)
    console.log(`🧠 [Embeddings] Provider: ${provider}`)

    try {
      const texts = chunks.map(chunk => chunk.content)
      let embeddings: number[][]
      let model: string

      switch (provider) {
        case 'openai':
          ({ embeddings, model } = await this.generateOpenAIEmbeddings(texts, options.model))
          break
        
        case 'huggingface':
          ({ embeddings, model } = await this.generateHuggingFaceEmbeddings(texts, options.model))
          break
        
        case 'local':
          ({ embeddings, model } = await this.generateLocalEmbeddings(texts, options.model))
          break
        
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }

      const dimensions = embeddings[0]?.length || 0
      const processingTime = Date.now() - startTime

      console.log(`✅ [Embeddings] Generated ${embeddings.length} embeddings`)
      console.log(`📊 [Embeddings] Dimensions: ${dimensions}`)
      console.log(`⏱️ [Embeddings] Processing time: ${processingTime}ms`)

      return {
        embeddings,
        dimensions,
        provider,
        model,
        processingTime,
      }
    } catch (error) {
      console.error(`❌ [Embeddings] Error:`, error)
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Générer des embeddings avec OpenAI
   */
  private async generateOpenAIEmbeddings(
    texts: string[],
    model: string = 'text-embedding-3-small'
  ): Promise<{ embeddings: number[][], model: string }> {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    console.log(`🔑 [Embeddings] Using OpenAI model: ${model}`)

    const { OpenAIEmbeddings } = await import('@langchain/openai')
    const embedder = new OpenAIEmbeddings({
      openAIApiKey: this.openaiApiKey,
      modelName: model,
    })

    const embeddings = await embedder.embedDocuments(texts)

    return { embeddings, model }
  }

  /**
   * Générer des embeddings avec HuggingFace
   */
  private async generateHuggingFaceEmbeddings(
    texts: string[],
    model: string = 'sentence-transformers/all-MiniLM-L6-v2'
  ): Promise<{ embeddings: number[][], model: string }> {
    if (!this.huggingfaceApiKey) {
      throw new Error('HUGGINGFACE_API_KEY not configured')
    }

    console.log(`🤗 [Embeddings] Using HuggingFace model: ${model}`)

    const { HuggingFaceInferenceEmbeddings } = await import('@langchain/community/embeddings/hf')
    const embedder = new HuggingFaceInferenceEmbeddings({
      apiKey: this.huggingfaceApiKey,
      model,
    })

    const embeddings = await embedder.embedDocuments(texts)

    return { embeddings, model }
  }

  /**
   * Générer des embeddings localement avec Transformers.js
   */
  private async generateLocalEmbeddings(
    texts: string[],
    model: string = 'Xenova/all-MiniLM-L6-v2'
  ): Promise<{ embeddings: number[][], model: string }> {
    console.log(`💻 [Embeddings] Using local model: ${model}`)

    try {
      // Import dynamique de @xenova/transformers
      const { pipeline } = await import('@xenova/transformers')

      // Créer le pipeline d'embeddings
      const embedder = await pipeline('feature-extraction', model)

      // Générer les embeddings
      const results = await Promise.all(
        texts.map(async (text) => {
          const output = await embedder(text, { pooling: 'mean', normalize: true })
          return Array.from(output.data) as number[]
        })
      )

      return { embeddings: results, model }
    } catch (error) {
      console.error(`❌ [Embeddings] Local embedding failed:`, error)
      throw new Error('Local embedding requires @xenova/transformers to be installed')
    }
  }

  /**
   * Générer un embedding pour une seule requête (pour la recherche)
   */
  async generateQueryEmbedding(
    query: string,
    options: EmbeddingOptions = {}
  ): Promise<number[]> {
    const provider = options.provider || this.getDefaultProvider()
    
    console.log(`🔍 [Embeddings] Generating query embedding`)

    try {
      let embedding: number[]

      switch (provider) {
        case 'openai':
          embedding = await this.generateSingleOpenAIEmbedding(query, options.model)
          break
        
        case 'huggingface':
          embedding = await this.generateSingleHuggingFaceEmbedding(query, options.model)
          break
        
        case 'local':
          embedding = await this.generateSingleLocalEmbedding(query, options.model)
          break
        
        default:
          throw new Error(`Unknown provider: ${provider}`)
      }

      console.log(`✅ [Embeddings] Query embedding generated (${embedding.length} dimensions)`)

      return embedding
    } catch (error) {
      console.error(`❌ [Embeddings] Query embedding error:`, error)
      throw error
    }
  }

  private async generateSingleOpenAIEmbedding(
    text: string,
    model: string = 'text-embedding-3-small'
  ): Promise<number[]> {
    if (!this.openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const { OpenAIEmbeddings } = await import('@langchain/openai')
    const embedder = new OpenAIEmbeddings({
      openAIApiKey: this.openaiApiKey,
      modelName: model,
    })

    return embedder.embedQuery(text)
  }

  private async generateSingleHuggingFaceEmbedding(
    text: string,
    model: string = 'sentence-transformers/all-MiniLM-L6-v2'
  ): Promise<number[]> {
    if (!this.huggingfaceApiKey) {
      throw new Error('HUGGINGFACE_API_KEY not configured')
    }

    const { HuggingFaceInferenceEmbeddings } = await import('@langchain/community/embeddings/hf')
    const embedder = new HuggingFaceInferenceEmbeddings({
      apiKey: this.huggingfaceApiKey,
      model,
    })

    return embedder.embedQuery(text)
  }

  private async generateSingleLocalEmbedding(
    text: string,
    model: string = 'Xenova/all-MiniLM-L6-v2'
  ): Promise<number[]> {
    const { pipeline } = await import('@xenova/transformers')
    const embedder = await pipeline('feature-extraction', model)
    const output = await embedder(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data) as number[]
  }

  /**
   * Déterminer le provider par défaut selon les clés API disponibles
   */
  private getDefaultProvider(): EmbeddingProvider {
    if (this.openaiApiKey) {
      return 'openai'
    }
    if (this.huggingfaceApiKey) {
      return 'huggingface'
    }
    return 'local'
  }

  /**
   * Vérifier si un provider est disponible
   */
  isProviderAvailable(provider: EmbeddingProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!this.openaiApiKey
      case 'huggingface':
        return !!this.huggingfaceApiKey
      case 'local':
        return true // Toujours disponible
      default:
        return false
    }
  }
}

// Instance singleton
export const embeddingService = new EmbeddingService()
