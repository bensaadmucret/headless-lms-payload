/**
 * Worker pour l'analyse NLP (Natural Language Processing)
 * Traite l'extraction de mots-clés, résumé, analyse de sentiment, entités
 */

import type { Job } from 'bull'
import type { NLPJob, NLPResult, ProcessingLog } from '../types'
import { nlpQueue } from '../queue'
import { nlpService } from '../services/nlpService'
import { getPayloadInstance } from '../initPayload'

/**
 * Configuration du worker NLP
 */
const WORKER_CONFIG = {
  concurrency: 2, // 2 documents NLP en parallèle (moins CPU-intensif que l'extraction)
  limiter: {
    max: 20, // 20 jobs par minute
    duration: 60 * 1000,
  },
}

/**
 * Traiter un job NLP
 */
export async function processNLPJob(job: Job<NLPJob>): Promise<NLPResult> {
  const { documentId, extractedText, language, features } = job.data

  console.log(`🧠 [NLP] Starting NLP analysis for document ${documentId} (${language}) with features: ${features.join(', ')}`)

  try {
    // Mettre à jour le status du document
    await updateDocumentStatus(documentId, 'analyzing', 10, 'Début de l\'analyse NLP...')

    // Traiter le texte avec le service NLP
    const result = await nlpService.processText(extractedText, language, features)

    if (!result.success) {
      throw new Error(result.error || 'NLP processing failed')
    }

    // Mettre à jour le document avec les résultats NLP
    await updateDocumentWithNLP(documentId, result)
    await updateDocumentStatus(documentId, 'analyzing', 100, 'Analyse NLP terminée avec succès')

    console.log(`✅ [NLP] Document ${documentId} NLP analysis completed`)
    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'NLP processing failed'
    console.error(`❌ [NLP] Document ${documentId} failed:`, errorMessage)

    await updateDocumentStatus(documentId, 'failed', 0, `Échec NLP: ${errorMessage}`)
    throw error
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
    console.log(`📝 [NLP-Status] Document ${documentId}: ${status} (${progress}%) - ${message}`)

    const payload = await getPayloadInstance()

    // Essayer d'abord knowledge-base
    try {
      // Récupérer les logs existants
      let existingLogs = ''
      try {
        const current = await payload.findByID({ collection: 'knowledge-base', id: documentId, depth: 0 })
        existingLogs = (current as any)?.processingLogs || ''
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
      console.log(`📝 [NLP-Status] Document ${documentId} not in knowledge-base, skipping status update (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [NLP-Status] Failed to update document ${documentId}:`, error)
  }
}

/**
 * Mettre à jour le document avec les résultats NLP
 */
async function updateDocumentWithNLP(documentId: string, result: NLPResult) {
  try {
    console.log(`📝 [NLP-Update] Document ${documentId} NLP results:`)
    console.log(`   - Keywords: ${result.keywords.length}`)
    if (result.summary) console.log(`   - Summary length: ${result.summary.length}`)
    if (result.sentiment) console.log(`   - Sentiment: ${result.sentiment.score} (${result.sentiment.label})`)
    if (result.entities) console.log(`   - Entities: ${result.entities.length}`)

    const payload = await getPayloadInstance()

    // Essayer d'abord knowledge-base
    try {
      // Préparer les données à mettre à jour
      const updateData: Record<string, unknown> = {
        lastProcessed: new Date().toISOString(),
        processingStatus: 'analyzing', // Sera mis à jour par le worker IA suivant
      }

      // Mots-clés
      if (result.keywords.length > 0) {
        updateData.keywords = result.keywords.map(k => ({
          term: k.term,
          relevance: k.relevance,
          category: k.category || 'general'
        }))
      }

      // Résumé automatique
      if (result.summary) {
        updateData.autoSummary = result.summary
      }

      // Analyse de sentiment
      if (result.sentiment) {
        updateData.sentiment = {
          score: result.sentiment.score,
          label: result.sentiment.label
        }
      }

      // Entités extraites
      if (result.entities && result.entities.length > 0) {
        updateData.extractedEntities = result.entities.map(e => ({
          text: e.text,
          type: e.type,
          confidence: e.confidence
        }))
      }

      await payload.update({
        collection: 'knowledge-base',
        id: documentId,
        data: updateData,
        overrideAccess: true,
      })
      return
    } catch {
      // Si ça échoue, essayer media (mais media n'a pas ces champs)
      console.log(`📝 [NLP-Update] Document ${documentId} not in knowledge-base, skipping NLP update (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [NLP-Update] Failed to update document ${documentId} NLP results:`, error)
  }
}

// ===== DÉMARRAGE DU WORKER =====

/**
 * Démarrer le worker NLP
 */
export function startNLPWorker() {
  console.log('🧠 [Worker] Starting NLP worker...')

  nlpQueue.process('process-nlp', WORKER_CONFIG.concurrency, processNLPJob)

  // Event handlers spécifiques au worker
  nlpQueue.on('completed', (job) => {
    const duration = job.processedOn ? Date.now() - job.processedOn : 'unknown'
    console.log(`✅ [NLPWorker] Job ${job.id} completed in ${duration}ms`)
  })

  nlpQueue.on('failed', (job, err) => {
    console.error(`❌ [NLPWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })

  nlpQueue.on('stalled', (job) => {
    console.warn(`⚠️ [NLPWorker] Job ${job.id} stalled, will be retried`)
  })

  console.log(`✅ [Worker] NLP worker started with concurrency ${WORKER_CONFIG.concurrency}`)
}

// Auto-start si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  startNLPWorker()
}
