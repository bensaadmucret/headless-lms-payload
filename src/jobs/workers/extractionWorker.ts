/**
 * Worker pour l'extraction de contenu des documents
 */

import type { Job } from 'bull'
import type { ExtractionJob, ExtractionResult, ProcessingLog } from '../types'
import { ExtractionError } from '../types'
import { extractionQueue } from '../queue'
import { pdfProcessor } from '../processors/pdfProcessor'
import { docxProcessor } from '../processors/docxProcessor'
import { txtProcessor } from '../processors/txtProcessor'
import { getPayloadInstance } from '../initPayload'
import { textToLexical } from '../../utils/lexicalUtils'

interface DocumentWithLogs {
  processingLogs?: string
  [key: string]: unknown
}

interface ChapterWithPages {
  title: string
  content?: string
  pageNumbers?: number[]
}

/**
 * Configuration du worker d'extraction
 */
const WORKER_CONFIG = {
  concurrency: 3, // 3 documents en parallèle max
  limiter: {
    max: 10, // 10 jobs par minute max
    duration: 60 * 1000,
  },
}

/**
 * Processer l'extraction d'un document
 */
export async function processExtractionJob(job: Job<ExtractionJob>): Promise<ExtractionResult> {
  const { documentId, fileType, sourceFileUrl, collectionType = 'media' } = job.data
  
  console.log(`🔍 [Extraction] Starting extraction for document ${documentId} (${fileType})`)
  
  try {
    // Mettre à jour le status du document
    await updateDocumentStatus(documentId, collectionType, 'extracting', 10, 'Début de l\'extraction...')
    
    let result: ExtractionResult
    
    // Choisir le bon processor selon le type de fichier
    switch (fileType) {
      case 'pdf':
        result = await pdfProcessor.extract(sourceFileUrl)
        break
      case 'docx':
        result = await docxProcessor.extract(sourceFileUrl)
        break
      case 'txt':
        result = await txtProcessor.extract(sourceFileUrl)
        break
      default:
        throw new ExtractionError(`Type de fichier non supporté: ${fileType}`, fileType)
    }
    
    if (!result.success) {
      throw new ExtractionError(result.error || 'Échec de l\'extraction', fileType, result as any)
    }
    
    // Validation du contenu extrait
    if (!result.extractedText || result.extractedText.trim().length === 0) {
      throw new ExtractionError('Aucun contenu textuel trouvé dans le document', fileType)
    }
    
    // Mise à jour avec le contenu extrait
    await updateDocumentWithExtraction(documentId, collectionType, result)
    await updateDocumentStatus(documentId, collectionType, 'extracting', 100, 'Extraction terminée avec succès')
    
    // Lancer automatiquement le job NLP
    await scheduleNextJobs(job.data, result)
    
    console.log(`✅ [Extraction] Document ${documentId} extracted successfully (${result.metadata.wordCount} mots)`)
    
    return result
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error(`❌ [Extraction] Document ${documentId} failed:`, errorMessage)
    
    await updateDocumentStatus(documentId, collectionType, 'failed', 0, `Échec extraction: ${errorMessage}`)
    
    // Re-lancer l'erreur pour que Bull la capture
    throw error
  }
}

/**
 * Mettre à jour le status du document dans la base
 */
async function updateDocumentStatus(
  documentId: string,
  collectionType: 'media',
  status: ProcessingLog['step'],
  progress: number,
  message: string
) {
  try {
    console.log(`📝 [Status] Document ${documentId}: ${status} (${progress}%) - ${message}`)

    const payload = await getPayloadInstance()

    // Pour Media, on ne fait que logger (pas de champs processingStatus)
    console.log(`📝 [Status] Media document ${documentId} - pas de mise à jour de statut`)
    return
  } catch (error) {
    console.error(`❌ [Status] Failed to update document ${documentId}:`, error)
  }
}

/**
 * Mettre à jour le document avec les résultats d'extraction
 */
async function updateDocumentWithExtraction(documentId: string, collectionType: 'media', result: ExtractionResult) {
  try {
    console.log(`📝 [Update] Document ${documentId} extraction completed:`)
    console.log(`   - Text length: ${result.extractedText.length} characters`)
    console.log(`   - Word count: ${result.metadata.wordCount}`)
    console.log(`   - Language: ${result.metadata.language}`)
    if (result.chapters) {
      console.log(`   - Chapters: ${result.chapters.length}`)
    }

    const payload = await getPayloadInstance()

    if (collectionType === 'media') {
      // Pour Media : mettre à jour le champ extractedContent (format texte brut)
      console.log(`📝 [Update] Mise à jour Media ${documentId} avec contenu extrait`)
      
      await payload.update({
        collection: 'media',
        id: documentId,
        data: {
          extractedContent: result.extractedText || '',
        },
        overrideAccess: true,
      })
      
    }
  } catch (error) {
    console.error(`❌ [Update] Failed to update document ${documentId} extraction:`, error)
  }
}

/**
 * Planifier les jobs suivants (NLP, IA)
 */
async function scheduleNextJobs(extractionData: ExtractionJob, extractionResult: ExtractionResult) {
  try {
    const { addNLPJob, addAIJob } = await import('../queue')
    
    // Job NLP
    const nlpJob = await addNLPJob({
      type: 'nlp-processing',
      documentId: extractionData.documentId,
      extractedText: extractionResult.extractedText,
      language: extractionResult.metadata.language === 'en' ? 'en' : 'fr',
      features: ['keywords', 'summary', 'entities'],
      priority: extractionData.priority,
      userId: extractionData.userId,
    })
    
    console.log(`🔗 [Chain] Scheduled NLP job ${nlpJob.id} for document ${extractionData.documentId}`)
    
    // Job IA (enrichissement)
    const aiJob = await addAIJob({
      type: 'ai-enrichment',
      documentId: extractionData.documentId,
      contentType: 'medical',
      tasks: ['summary', 'concept-extraction', 'difficulty-assessment'],
      context: {
        medicalDomain: 'general',
        targetAudience: 'medical_students'
      },
      priority: extractionData.priority,
      userId: extractionData.userId,
    })
    
    console.log(`🔗 [Chain] Scheduled AI job ${aiJob.id} for document ${extractionData.documentId}`)
    
  } catch (error) {
    console.error(`⚠️ [Chain] Failed to schedule next jobs for ${extractionData.documentId}:`, error)
    // Ne pas faire échouer le job principal pour ça
  }
}

// ===== DÉMARRAGE DU WORKER =====

/**
 * Démarrer le worker d'extraction
 */
export function startExtractionWorker() {
  console.log('🚀 [Worker] Starting extraction worker...')
  
  extractionQueue.process('extract-document', WORKER_CONFIG.concurrency, processExtractionJob)
  
  // Event handlers spécifiques au worker
  extractionQueue.on('completed', (job) => {
    const duration = job.processedOn ? Date.now() - job.processedOn : 'unknown'
    console.log(`✅ [ExtractionWorker] Job ${job.id} completed in ${duration}ms`)
  })
  
  extractionQueue.on('failed', (job, err) => {
    console.error(`❌ [ExtractionWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })
  
  extractionQueue.on('stalled', (job) => {
    console.warn(`⚠️ [ExtractionWorker] Job ${job.id} stalled, will be retried`)
  })
  
  console.log(`✅ [Worker] Extraction worker started with concurrency ${WORKER_CONFIG.concurrency}`)
}

// Auto-start si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  startExtractionWorker()
}