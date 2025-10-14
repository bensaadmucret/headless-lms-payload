/**
 * Service de découpage intelligent du texte (Chunking)
 * Transforme un long texte en morceaux optimaux pour le RAG
 */

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export interface ChunkOptions {
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
}

export interface TextChunk {
  content: string
  index: number
  metadata: {
    startChar: number
    endChar: number
    length: number
  }
}

export interface ChunkingResult {
  chunks: TextChunk[]
  totalChunks: number
  totalCharacters: number
  averageChunkSize: number
}

/**
 * Service de chunking avec stratégies multiples
 */
export class ChunkingService {
  private defaultOptions: Required<ChunkOptions> = {
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  }

  /**
   * Découper un texte en chunks intelligents
   */
  async chunkText(
    text: string,
    options: ChunkOptions = {}
  ): Promise<ChunkingResult> {
    const opts = { ...this.defaultOptions, ...options }

    console.log(`📦 [Chunking] Starting text chunking...`)
    console.log(`📦 [Chunking] Text length: ${text.length} chars`)
    console.log(`📦 [Chunking] Chunk size: ${opts.chunkSize}, Overlap: ${opts.chunkOverlap}`)

    try {
      // Créer le splitter avec LangChain
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: opts.chunkSize,
        chunkOverlap: opts.chunkOverlap,
        separators: opts.separators,
      })

      // Découper le texte
      const rawChunks = await splitter.splitText(text)

      // Enrichir avec métadonnées
      let currentPosition = 0
      const chunks: TextChunk[] = rawChunks.map((content, index) => {
        const startChar = text.indexOf(content, currentPosition)
        const endChar = startChar + content.length
        currentPosition = endChar

        return {
          content,
          index,
          metadata: {
            startChar,
            endChar,
            length: content.length,
          },
        }
      })

      const totalCharacters = chunks.reduce((sum, chunk) => sum + chunk.metadata.length, 0)
      const averageChunkSize = Math.round(totalCharacters / chunks.length)

      console.log(`✅ [Chunking] Created ${chunks.length} chunks`)
      console.log(`📊 [Chunking] Average chunk size: ${averageChunkSize} chars`)

      return {
        chunks,
        totalChunks: chunks.length,
        totalCharacters,
        averageChunkSize,
      }
    } catch (error) {
      console.error(`❌ [Chunking] Error:`, error)
      throw new Error(`Chunking failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Découper par chapitres (pour documents structurés)
   */
  async chunkByChapters(
    text: string,
    chapterPattern: RegExp = /^(Chapter|Chapitre|Section)\s+\d+/gim
  ): Promise<ChunkingResult> {
    console.log(`📚 [Chunking] Chunking by chapters...`)

    const chapterMatches = Array.from(text.matchAll(chapterPattern))
    
    if (chapterMatches.length === 0) {
      console.log(`⚠️ [Chunking] No chapters found, falling back to standard chunking`)
      return this.chunkText(text)
    }

    const chunks: TextChunk[] = []
    
    for (let i = 0; i < chapterMatches.length; i++) {
      const startMatch = chapterMatches[i]
      const endMatch = chapterMatches[i + 1]
      
      // Skip if match or index is undefined (should not happen with matchAll, but TypeScript requires the check)
      if (!startMatch || startMatch.index === undefined) continue
      
      const startChar = startMatch.index
      const endChar = endMatch?.index ?? text.length
      
      const content = text.slice(startChar, endChar).trim()
      
      chunks.push({
        content,
        index: i,
        metadata: {
          startChar,
          endChar,
          length: content.length,
        },
      })
    }

    const totalCharacters = chunks.reduce((sum, chunk) => sum + chunk.metadata.length, 0)
    const averageChunkSize = Math.round(totalCharacters / chunks.length)

    console.log(`✅ [Chunking] Created ${chunks.length} chapter-based chunks`)

    return {
      chunks,
      totalChunks: chunks.length,
      totalCharacters,
      averageChunkSize,
    }
  }

  /**
   * Découper avec taille fixe (pour tests rapides)
   */
  async chunkByFixedSize(
    text: string,
    size: number = 1000,
    overlap: number = 0
  ): Promise<ChunkingResult> {
    console.log(`✂️ [Chunking] Fixed-size chunking: ${size} chars, overlap: ${overlap}`)

    const chunks: TextChunk[] = []
    let index = 0
    let position = 0

    while (position < text.length) {
      const endPosition = Math.min(position + size, text.length)
      const content = text.slice(position, endPosition)

      chunks.push({
        content,
        index,
        metadata: {
          startChar: position,
          endChar: endPosition,
          length: content.length,
        },
      })

      position += size - overlap
      index++
    }

    const totalCharacters = chunks.reduce((sum, chunk) => sum + chunk.metadata.length, 0)
    const averageChunkSize = Math.round(totalCharacters / chunks.length)

    console.log(`✅ [Chunking] Created ${chunks.length} fixed-size chunks`)

    return {
      chunks,
      totalChunks: chunks.length,
      totalCharacters,
      averageChunkSize,
    }
  }

  /**
   * Nettoyer et préparer le texte avant chunking
   */
  preprocessText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normaliser les sauts de ligne
      .replace(/\n{3,}/g, '\n\n') // Réduire les multiples sauts de ligne
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .trim()
  }
}

// Instance singleton
export const chunkingService = new ChunkingService()
