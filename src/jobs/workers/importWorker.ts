/**
 * Worker pour l'import de fichiers JSON/CSV
 * Traite les imports de questions, flashcards, learning paths
 */

import type { Job } from 'bull'
import { importQueue } from '../queue'
import { getPayloadInstance } from '../initPayload'
import { jsonImportProcessEndpoint } from '../../endpoints/jsonImportProcess'

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
 * Traiter un job d'import en appelant l'endpoint existant
 */
export async function processImportJob(job: Job<ImportJobData>): Promise<ImportJobResult> {
  const { importJobId } = job.data

  console.log(`📥 [Import] Starting import job ${importJobId}`)

  const payload = await getPayloadInstance()

  try {
    // Créer une fausse requête pour l'endpoint
    const mockReq = {
      payload,
      routeParams: { jobId: importJobId },
      user: { id: job.data.userId }
    } as any

    // Appeler directement l'endpoint de traitement
    const response = await jsonImportProcessEndpoint(mockReq)
    
    // Parser la réponse
    const result = await response.json()

    if (result.success) {
      console.log(`✅ [Import] Job ${importJobId} completed`)
      return {
        success: true,
        totalItems: result.result?.totalItems || 0,
        processedItems: result.result?.processedItems || 0,
        successfulItems: result.result?.successfulItems || 0,
        failedItems: result.result?.failedItems || 0
      }
    } else {
      console.error(`❌ [Import] Job ${importJobId} failed:`, result.error)
      return {
        success: false,
        totalItems: 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        errors: [{
          type: 'system' as const,
          severity: 'critical' as const,
          message: result.error || 'Erreur inconnue'
        }]
      }
    }

  } catch (error) {
    console.error(`❌ [Import] Job ${importJobId} failed:`, error)

    // Mettre à jour le statut à "failed"
    await payload.update({
      collection: 'import-jobs',
      id: importJobId,
      data: {
        status: 'failed',
        errors: [{
          type: 'system' as const,
          severity: 'critical' as const,
          message: error instanceof Error ? error.message : String(error),
          suggestion: 'Vérifiez le fichier et réessayez'
        }],
        completedAt: new Date().toISOString()
      }
    })

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
