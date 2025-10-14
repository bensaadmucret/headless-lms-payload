/**
 * Worker pour la validation de qualité du contenu
 * Contrôles médicaux, qualité du contenu, conformité
 */

import type { Job } from 'bull'
import type { ValidationJob, ValidationResult, ProcessingLog } from '../types'
import { validationQueue } from '../queue'
import { validationService } from '../services/validationService'
import { getPayloadInstance } from '../initPayload'

/**
 * Configuration du worker de validation
 */
const WORKER_CONFIG = {
  concurrency: 3, // 3 validations en parallèle
  limiter: {
    max: 30, // 30 jobs par minute
    duration: 60 * 1000,
  },
}

/**
 * Traiter un job de validation
 */
export async function processValidationJob(job: Job<ValidationJob>): Promise<ValidationResult> {
  const { documentId, validationType, rules } = job.data

  console.log(`🔍 [Validation] Starting ${validationType} validation for document ${documentId} with ${rules.length} rules`)

  try {
    // Mettre à jour le status du document
    await updateDocumentStatus(documentId, 'validating', 10, `Début validation ${validationType}...`)

    // Récupérer le contenu du document
    const documentContent = await getDocumentContent(documentId)
    if (!documentContent) {
      throw new Error('Document content not found for validation')
    }

    // Valider le document
    const result = await validationService.validateDocument(documentContent, validationType, rules)

    if (!result.success) {
      throw new Error(result.error || 'Validation failed')
    }

    // Mettre à jour le document avec les résultats de validation
    await updateDocumentWithValidation(documentId, result)
    
    // Marquer le traitement comme terminé avec succès
    await markProcessingCompleted(documentId)
    
    await updateDocumentStatus(documentId, 'completed', 100, `Validation ${validationType} terminée (score: ${result.score}/100)`)

    console.log(`✅ [Validation] Document ${documentId} validation completed with score ${result.score}/100`)
    return result

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation failed'
    console.error(`❌ [Validation] Document ${documentId} failed:`, errorMessage)

    await updateDocumentStatus(documentId, 'failed', 0, `Échec validation: ${errorMessage}`)
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
      const document = await payload.findByID({
        collection: 'knowledge-base',
        id: documentId,
        depth: 0
      })
      return (document as any)?.extractedContent || null
    } catch {
      // Si ça échoue, essayer media
      try {
        const document = await payload.findByID({
          collection: 'media',
          id: documentId,
          depth: 0
        })
        return (document as any)?.extractedContent || null
      } catch {
        console.error(`❌ [Validation] Document ${documentId} not found in knowledge-base or media collections`)
        return null
      }
    }
  } catch (error) {
    console.error(`❌ [Validation] Failed to get document content ${documentId}:`, error)
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
    console.log(`📝 [Validation-Status] Document ${documentId}: ${status} (${progress}%) - ${message}`)

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
      console.log(`📝 [Validation-Status] Document ${documentId} not in knowledge-base, skipping status update (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [Validation-Status] Failed to update document ${documentId}:`, error)
  }
}

/**
 * Mettre à jour le document avec les résultats de validation
 */
async function updateDocumentWithValidation(documentId: string, result: ValidationResult) {
  try {
    console.log(`📝 [Validation-Update] Document ${documentId} validation results: Score ${result.score}/100, Issues: ${result.issues.length}`)

    const payload = await getPayloadInstance()

    // Essayer d'abord knowledge-base
    try {
      // Préparer les données à mettre à jour
      const updateData: Record<string, unknown> = {
        lastProcessed: new Date().toISOString(),
        processingStatus: 'completed',
        validationScore: result.score,
        validationPassed: result.score >= 70, // Seuil de validation
      }

      // Issues de validation
      if (result.issues.length > 0) {
        updateData.validationIssues = result.issues.map(issue => ({
          ruleId: issue.ruleId,
          severity: issue.severity,
          message: issue.message,
          suggestions: issue.suggestions || []
        }))
      }

      // Recommandations
      if (result.recommendations.length > 0) {
        updateData.validationRecommendations = result.recommendations
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
      console.log(`📝 [Validation-Update] Document ${documentId} not in knowledge-base, skipping validation update (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [Validation-Update] Failed to update document ${documentId} validation results:`, error)
  }
}

/**
 * Marquer le traitement du document comme terminé avec succès
 */
async function markProcessingCompleted(documentId: string) {
  try {
    console.log(`🏁 [Validation] Marking document ${documentId} as fully processed`)

    const payload = await getPayloadInstance()

    // Essayer d'abord knowledge-base
    try {
      await payload.update({
        collection: 'knowledge-base',
        id: documentId,
        data: {
          processingCompleted: true,
          processingCompletedAt: new Date().toISOString(),
        },
        overrideAccess: true,
      })
      return
    } catch {
      // Si ça échoue, essayer media (mais media n'a pas ces champs)
      console.log(`🏁 [Validation] Document ${documentId} not in knowledge-base, skipping completion marking (media collection)`)
    }
  } catch (error) {
    console.error(`❌ [Validation] Failed to mark document ${documentId} as completed:`, error)
  }
}

// ===== DÉMARRAGE DU WORKER =====

/**
 * Démarrer le worker de validation
 */
export function startValidationWorker() {
  console.log('🔍 [Worker] Starting validation worker...')

  validationQueue.process('validate-document', WORKER_CONFIG.concurrency, processValidationJob)

  // Event handlers spécifiques au worker
  validationQueue.on('completed', (job) => {
    const duration = job.processedOn ? Date.now() - job.processedOn : 'unknown'
    console.log(`✅ [ValidationWorker] Job ${job.id} completed in ${duration}ms`)
  })

  validationQueue.on('failed', (job, err) => {
    console.error(`❌ [ValidationWorker] Job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message)
  })

  validationQueue.on('stalled', (job) => {
    console.warn(`⚠️ [ValidationWorker] Job ${job.id} stalled, will be retried`)
  })

  console.log(`✅ [Worker] Validation worker started with concurrency ${WORKER_CONFIG.concurrency}`)
}

// Auto-start si ce fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  startValidationWorker()
}
