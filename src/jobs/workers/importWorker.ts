/**
 * Worker pour l'import de fichiers JSON/CSV
 * Traite les imports de questions, flashcards, learning paths
 */

import type { Job } from 'bull'
import { importQueue } from '../queue'
import { getPayloadInstance } from '../initPayload'
import { ImportJobProcessingService } from '../../services/ImportJobProcessingService'

/**
 * Type de données du job d'import
 */
export interface ImportJobData {
  importJobId: string
  fileId: string
  importType: 'questions' | 'flashcards' | 'learning-paths' | 'csv'
  options: {
    dryRun?: boolean
    batchSize?: number
    overwriteExisting?: boolean
    generateDistractors?: boolean
    requireHumanValidation?: boolean
  }
  userId: string
}

/**
 * Résultat du traitement d'import
 */
export interface ImportJobResult {
  success: boolean
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  errors?: Array<{
    type: string
    severity: string
    message: string
    suggestion?: string
  }>
}

/**
 * Configuration du worker d'import
 */
const WORKER_CONFIG = {
  concurrency: 2, // 2 imports en parallèle max
  limiter: {
    max: 10, // 10 jobs par minute max
    duration: 60 * 1000,
  },
}

/**
 * Traiter un job d'import avec le service dédié
 */
export async function processImportJob(job: Job<ImportJobData>): Promise<ImportJobResult> {
  const { importJobId, userId } = job.data

  console.log(`📥 [Import] Starting import job ${importJobId}`)

  const payload = await getPayloadInstance()
  const importService = new ImportJobProcessingService()

  try {
    // Appeler le service de traitement
    const result = await importService.processImportJob(payload, importJobId, userId)

    console.log(`✅ [Import] Job ${importJobId} completed: ${result.successfulItems}/${result.totalItems}`)

    return result

  } catch (error) {
    console.error(`❌ [Import] Job ${importJobId} failed:`, error)

    // Le service a déjà mis à jour le statut, on propage juste l'erreur
    throw error
  }
}

/**
 * Démarrer le worker
 */
export function startImportWorker() {
  console.log('🚀 Starting Import Worker...')

  importQueue.process(WORKER_CONFIG.concurrency, processImportJob)

  // Event listeners
  importQueue.on('completed', (job, result) => {
    console.log(`✅ [Import] Job ${job.id} completed:`, result)
  })

  importQueue.on('failed', (job, err) => {
    console.error(`❌ [Import] Job ${job?.id} failed:`, err.message)
  })

  importQueue.on('stalled', (job) => {
    console.warn(`⚠️ [Import] Job ${job.id} stalled`)
  })

  console.log('✅ Import Worker started')
}
