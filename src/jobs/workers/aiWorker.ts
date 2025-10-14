/**
 * Worker pour l'enrichissement IA
 * Génère des résumés intelligents, quiz, extraction de concepts
 */

import type { Job } from 'bull'
import type { AIJob, AIResult, ProcessingLog } from '../types'
import { aiQueue, addValidationJob } from '../queue'
import { aiService } from '../services/aiService'
import { getPayloadInstance } from '../initPayload'

interface DocumentWithContent {
  extractedContent?: string
  processingLogs?: string
  [key: string]: unknown
}

/**
 * Configuration du worker IA
 */
const WORKER_CONFIG = {
  concurrency: 1, // 1 document IA à la fois (APIs externes coûteuses)
  limiter: {
    max: 5, // 5 jobs par minute max (respecter les limites API)
    duration: 60 * 1000,
  },
}

/**
 * Traiter un job IA
 */
export async function processAIJob(job: Job<AIJob>): Promise<AIResult> {
  const { documentId, contentType, tasks, context } = job.data

  console.log(`🤖 [AI] Starting AI enrichment for document ${documentId} (${contentType}) with tasks: ${tasks.join(', ')}`)

  try {
    // Mettre à jour le status du document
    await updateDocumentStatus(documentId, 'enriching', 10, 'Début de l\'enrichissement IA...')

    // Récupérer le contenu du document
    console.log(`📥 [AI] Fetching content for document ${documentId}...`)
    const documentContent = await getDocumentContent(documentId)
    
    if (!documentContent) {
      throw new Error(`Document content not found or empty for AI enrichment. Document ID: ${documentId}. Please ensure the extraction step completed successfully.`)
    }
    
    console.log(`✅ [AI] Content retrieved: ${documentContent.length} characters`)

    // Enrichir le contenu avec l'IA
    console.log(`🤖 [AI] Starting AI enrichment with ${tasks.length} tasks...`)
    const result = await aiService.enrichContent(documentContent, contentType, tasks, context)

    if (!result.success) {
      throw new Error(result.error || 'AI enrichment failed')
    }
    
    console.log(`✅ [AI] AI enrichment successful`)

    // Mettre à jour le document avec les résultats IA
    await updateDocumentWithAI(documentId, result)
    await updateDocumentStatus(documentId, 'enriching', 100, 'Enrichissement IA terminé avec succès')

    // Déclencher automatiquement le job de validation
    console.log(`🔗 [AI] Triggering validation job for document ${documentId}`)
    try {
      await addValidationJob({
        type: 'validation-check',
        documentId,
        userId: job.data.userId,
        validationType: 'quality',
        rules: [
          {
            id: 'medical-accuracy',
            name: 'Medical Accuracy',
            description: 'Verify medical information accuracy',
            category: 'medical',
            severity: 'error'
          },
          {
            id: 'content-completeness',
            name: 'Content Completeness',
            description: 'Check if content is complete and well-structured',
            category: 'quality',
            severity: 'warning'
          },
          {
            id: 'structure-check',
            name: 'Structure Check',
            description: 'Validate document structure and formatting',
            category: 'format',
            severity: 'warning'
          }
        ],
        priority: 'normal'
      })
      console.log(`✅ [AI] Validation job queued for document ${documentId}`)
    } catch (validationError) {
      console.error(`⚠️ [AI] Failed to queue validation job for document ${documentId}:`, validationError)
      // Ne pas faire échouer le job IA si la validation ne peut pas être ajoutée
    }

    console.log(`✅ [AI] Document ${documentId} AI enrichment completed`)
    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'AI enrichment failed'
    console.error(`❌ [AI] Document ${documentId} failed:`, errorMessage)

    await updateDocumentStatus(documentId, 'failed', 0, `Échec IA: ${errorMessage}`)
    throw error
  }
}

/**
 * Récupérer le contenu du document
 */
async function getDocumentContent(documentId: string): Promise<string | null> {
  try {
    const payload = await getPayloadInstance()
    
    // Essayer d'abord knowledge-base
    try {
      console.log(`🔍 [AI] Fetching document ${documentId} from knowledge-base...`)
      const document = await payload.findByID({
        collection: 'knowledge-base',
        id: documentId,
        depth: 0
      })
      
      const content = (document as unknown as DocumentWithContent)?.extractedContent
      
      if (content && content.trim().length > 0) {
        console.log(`✅ [AI] Found content in knowledge-base: ${content.length} characters`)
        return content
      } else {
        console.warn(`⚠️ [AI] Document ${documentId} found in knowledge-base but extractedContent is empty or missing`)
        console.log(`📋 [AI] Document fields:`, Object.keys(document))
        return null
      }
    } catch (kbError) {
      console.log(`ℹ️ [AI] Document ${documentId} not in knowledge-base, trying media...`)
      
      // Si ça échoue, essayer media
      try {
        console.log(`🔍 [AI] Fetching document ${documentId} from media...`)
        const document = await payload.findByID({
          collection: 'media',
          id: documentId,
          depth: 0
        })
        
        const content = (document as unknown as DocumentWithContent)?.extractedContent
        
        if (content && content.trim().length > 0) {
          console.log(`✅ [AI] Found content in media: ${content.length} characters`)
          return content
        } else {
          console.warn(`⚠️ [AI] Document ${documentId} found in media but extractedContent is empty or missing`)
          console.log(`📋 [AI] Document fields:`, Object.keys(document))
          return null
        }
      } catch (mediaError) {
        console.error(`❌ [AI] Document ${documentId} not found in media collection:`, mediaError instanceof Error ? mediaError.message : mediaError)
        return null
      }
    }
  } catch (error) {
    console.error(`❌ [AI] Failed to get document content ${documentId}:`, error instanceof Error ? error.message : error)
    return null
  }
}

/**
 * Mettre à jour le status du document
 */
async function updateDocumentStatus(
  documentId: string,
  status: ProcessingLog['step'],
  progress: number,
  message: string
) {
  try {
    console.log(`📝 [AI-Status] Document ${documentId}: ${status} (${progress}%) - ${message}`)

    const payload = await getPayloadInstance()

    // Essayer d'abord knowledge-base
    try {
      // Récupérer les logs existants
      let existingLogs = ''
      try {
        const current = await payload.findByID({ collection: 'knowledge-base', id: documentId, depth: 0 })
        existingLogs = (current as unknown as DocumentWithContent)?.processingLogs || ''
      } catch {}

      const newLogs = `${existingLogs ? existingLogs + '\n' : ''}[${new Date().toISOString()}] ${status} ${progress}% - ${message}`.slice(0, 50000)

      await payload.update({
        collection: 'knowledge-base',
        id: documentId,
        data: {
          processingStatus: status,
          lastProcessed: new Date().toISOString(),
          processingLogs: newLogs,
        } as any,
        overrideAccess: true,
      })
      return
    } catch {
      // Si ça échoue, essayer media (mais media n'a pas ces champs)
      console.log(`📝 [AI-Status] Document ${documentId} not in knowledge-base, skipping status update (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [AI-Status] Failed to update document ${documentId}:`, error)
  }
}

/**
 * Mettre à jour le document avec les résultats IA
 */
async function updateDocumentWithAI(documentId: string, result: AIResult) {
  try {
    console.log(`📝 [AI-Update] Document ${documentId} AI results:`)
    if (result.aiSummary) console.log(`   - AI Summary length: ${result.aiSummary.length}`)
    if (result.conceptsExtracted) console.log(`   - Concepts: ${result.conceptsExtracted.length}`)
    if (result.suggestedQuestions) console.log(`   - Questions: ${result.suggestedQuestions.length}`)
    if (result.difficultyScore !== undefined) console.log(`   - Difficulty: ${result.difficultyScore}`)

    const payload = await getPayloadInstance()

    // Essayer d'abord knowledge-base
    try {
      // Préparer les données à mettre à jour
      const updateData: Record<string, unknown> = {
        lastProcessed: new Date().toISOString(),
        processingStatus: 'validating', // Sera mis à jour par le worker de validation suivant
      }

      // Résumé IA
      if (result.aiSummary) {
        updateData.aiSummary = result.aiSummary
      }

      // Concepts extraits
      if (result.conceptsExtracted && result.conceptsExtracted.length > 0) {
        updateData.extractedConcepts = result.conceptsExtracted.map(c => ({
          concept: c.concept,
          definition: c.definition,
          importance: c.importance
        }))
      }

      // Questions suggérées
      if (result.suggestedQuestions && result.suggestedQuestions.length > 0) {
        updateData.suggestedQuestions = result.suggestedQuestions.map(q => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          answers: q.answers,
          correctAnswer: q.correctAnswer
        }))
      }

      // Score de difficulté
      if (result.difficultyScore !== undefined) {
        updateData.difficultyScore = result.difficultyScore
      }

      // Marquer comme enrichi par IA
      updateData.aiEnriched = true

      await payload.update({
        collection: 'knowledge-base',
        id: documentId,
        data: updateData,
        overrideAccess: true,
      })
      return
    } catch {
      // Si ça échoue, essayer media (mais media n'a pas ces champs)
      console.log(`📝 [AI-Update] Document ${documentId} not in knowledge-base, skipping AI update (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [AI-Update] Failed to update document ${documentId} AI results:`, error)
  }
}

// ===== DÉMARRAGE DU WORKER =====

/**
 * Démarrer le worker IA
 */
export function startAIWorker() {
  console.log('🤖 [Worker] Starting AI worker...')

  aiQueue.process('ai-enrichment', WORKER_CONFIG.concurrency, processAIJob)

  // Event handlers spécifiques au worker
  aiQueue.on('completed', (job) => {
    const duration = job.processedOn ? Date.now() - job.processedOn : 'unknown'
    console.log(`✅ [AIWorker] Job ${job.id} completed in ${duration}ms`)
  })

  aiQueue.on('failed', (job, err) => {
    console.error(`❌ [AIWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })

  aiQueue.on('stalled', (job) => {
    console.warn(`⚠️ [AIWorker] Job ${job.id} stalled, will be retried`)
  })

  console.log(`✅ [Worker] AI worker started with concurrency ${WORKER_CONFIG.concurrency}`)
}

// Auto-start si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  startAIWorker()
}
