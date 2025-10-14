/**
 * Service d'extraction automatique de contenu pour les media uploadés
 */

import path from 'path'
import { PayloadRequest } from 'payload'
import type { Media } from '../payload-types'
import { addExtractionJob } from '../jobs/queue'

/**
 * Types de fichiers supportés pour l'extraction
 */
const SUPPORTED_EXTRACTION_TYPES = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/epub+zip': 'epub',
} as const

type SupportedMimeType = keyof typeof SUPPORTED_EXTRACTION_TYPES
type ExtractionType = typeof SUPPORTED_EXTRACTION_TYPES[SupportedMimeType]

/**
 * Vérifie si un fichier peut avoir son contenu extrait
 */
export function canExtractContent(mimeType: string): boolean {
  return mimeType in SUPPORTED_EXTRACTION_TYPES
}

/**
 * Obtient le type d'extraction basé sur le MIME type
 */
export function getExtractionType(mimeType: string): ExtractionType | null {
  if (!canExtractContent(mimeType)) {
    return null
  }
  return SUPPORTED_EXTRACTION_TYPES[mimeType as SupportedMimeType]
}

/**
 * Déclenche l'extraction de contenu pour un media uploadé
 */
export async function triggerContentExtraction(
  mediaDocument: Media,
  req: PayloadRequest
): Promise<void> {
  try {
    const { mimeType, filename, filesize } = mediaDocument

    // Vérifier si l'extraction est supportée
    if (!mimeType || !canExtractContent(mimeType)) {
      console.log(`⏭️ [MediaExtraction] Skipping unsupported file type: ${mimeType} for ${filename}`)
      return
    }

    const extractionType = getExtractionType(mimeType)!

    console.log(`🚀 [MediaExtraction] Starting extraction for ${filename} (${extractionType})`)

    // Construire l'URL du fichier
    const fullFilePath = path.join(process.cwd(), 'public/media', filename || '')

    // Si c'est un PDF et qu'il est petit, on peut faire l'extraction en direct
    // Pour les gros fichiers, on utilise la queue
    const shouldUseQueue = !filesize || filesize > 5 * 1024 * 1024 // 5MB

    if (!shouldUseQueue && extractionType === 'pdf') {
      console.log(`⚡ [MediaExtraction] Direct extraction for small PDF: ${filename}`)
      await performDirectExtraction(mediaDocument, fullFilePath, req)
    } else {
      console.log(`📋 [MediaExtraction] Queuing extraction for: ${filename}`)
      await queueExtraction(mediaDocument, fullFilePath, extractionType, req)
    }

  } catch (error) {
    console.error(`❌ [MediaExtraction] Failed to trigger extraction for media ${mediaDocument.id}:`, error)
    // Ne pas faire échouer l'upload si l'extraction échoue
  }
}

/**
 * Extraction directe (pour les petits fichiers)
 */
async function performDirectExtraction(
  mediaDocument: Media,
  filePath: string,
  req: PayloadRequest
): Promise<void> {
  try {
    // Utiliser l'extracteur PDF simplifié
    const { extractPdfContent } = await import('./simplePdfExtractor')
    const result = await extractPdfContent(filePath)

    if (result.success && result.extractedText) {
      // Mettre à jour le document media avec le contenu extrait
      await updateMediaWithExtractedContent(mediaDocument.id, result, req)
      console.log(`✅ [MediaExtraction] Direct extraction completed for ${mediaDocument.filename}`)
    } else {
      console.warn(`⚠️ [MediaExtraction] Direct extraction failed for ${mediaDocument.filename}: ${result.error}`)
    }

  } catch (error) {
    console.error(`❌ [MediaExtraction] Direct extraction error for ${mediaDocument.filename}:`, error)
  }
}

/**
 * Ajout du job d'extraction à la queue
 */
async function queueExtraction(
  mediaDocument: Media,
  filePath: string,
  extractionType: ExtractionType,
  req: PayloadRequest
): Promise<void> {
  try {
    await addExtractionJob({
      type: 'document-extraction',
      documentId: mediaDocument.id.toString(),
      fileType: extractionType,
      sourceFileId: mediaDocument.id.toString(),
      sourceFileUrl: filePath,
      userId: req.user?.id?.toString() || 'anonymous',
      priority: 'normal',
      collectionType: 'media'
    })

    console.log(`📋 [MediaExtraction] Extraction job queued for ${mediaDocument.filename}`)

  } catch (error) {
    console.error(`❌ [MediaExtraction] Failed to queue extraction for ${mediaDocument.filename}:`, error)
  }
}

/**
 * Met à jour le document media avec le contenu extrait
 */
async function updateMediaWithExtractedContent(
  mediaId: string | number,
  extractionResult: {
    extractedText?: string;
    chapters?: unknown[];
    metadata?: {
      wordCount?: number;
      pageCount?: number;
      language?: string;
    }
  },
  req: PayloadRequest
): Promise<void> {
  try {
    const payload = req.payload

    await payload.update({
      collection: 'media',
      id: mediaId,
      data: {
        extractedContent: extractionResult.extractedText?.substring(0, 10000), // Limiter pour éviter les problèmes de taille
        // Retirer extractionMetadata car il n'existe pas dans le schéma Media
        // extractionMetadata: {
        //   wordCount: extractionResult.metadata?.wordCount,
        //   pageCount: extractionResult.metadata?.pageCount,
        //   language: extractionResult.metadata?.language,
        //   extractedAt: new Date().toISOString(),
        //   success: true,
        // }
      },
      user: req.user,
    })

    console.log(`📝 [MediaExtraction] Updated media ${mediaId} with extracted content`)

  } catch (error) {
    console.error(`❌ [MediaExtraction] Failed to update media ${mediaId} with extraction:`, error)
  }
}

/**
 * Statistiques d'extraction pour l'admin
 */
export async function getExtractionStats(req: PayloadRequest) {
  try {
    const payload = req.payload

    // Compter les médias avec du contenu extrait
    const withContent = await payload.count({
      collection: 'media',
      where: {
        extractedContent: {
          exists: true,
        }
      }
    })

    // Compter les médias extractibles
    const extractable = await payload.count({
      collection: 'media',
      where: {
        mimeType: {
          in: Object.keys(SUPPORTED_EXTRACTION_TYPES)
        }
      }
    })

    // Compter le total
    const total = await payload.count({
      collection: 'media'
    })

    return {
      total: total.totalDocs,
      extractable: extractable.totalDocs,
      withContent: withContent.totalDocs,
      extractionRate: extractable.totalDocs > 0 ? (withContent.totalDocs / extractable.totalDocs * 100).toFixed(1) : 0,
      supportedTypes: Object.keys(SUPPORTED_EXTRACTION_TYPES),
    }

  } catch (error) {
    console.error('❌ [MediaExtraction] Failed to get extraction stats:', error)
    return {
      total: 0,
      extractable: 0,
      withContent: 0,
      extractionRate: 0,
      supportedTypes: Object.keys(SUPPORTED_EXTRACTION_TYPES),
    }
  }
}