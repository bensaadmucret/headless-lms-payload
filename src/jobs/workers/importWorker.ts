/**
 * Worker pour l'import de fichiers JSON/CSV
 * Traite les imports de questions, flashcards, learning paths
 */

import type { Job } from 'bull'
import { importQueue } from '../queue'
import { getPayloadInstance } from '../initPayload'
import { JSONValidationService } from '../../services/JSONValidationService'
import { JSONProcessingService } from '../../services/JSONProcessingService'
import { BatchProcessingService } from '../../services/BatchProcessingService'
import { CSVImportService } from '../../services/CSVImportService'

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
 * Traiter un job d'import
 */
export async function processImportJob(job: Job<ImportJobData>): Promise<ImportJobResult> {
  const { importJobId, fileId, importType, options, userId } = job.data

  console.log(`📥 [Import] Starting import job ${importJobId} - Type: ${importType}`)

  const payload = await getPayloadInstance()

  try {
    // Mettre à jour le statut à "processing"
    await payload.update({
      collection: 'import-jobs',
      id: importJobId,
      data: {
        status: 'processing'
      }
    })

    // Récupérer le fichier depuis Media
    console.log(`📄 [Import] Fetching file ${fileId}...`)
    const mediaDoc = await payload.findByID({
      collection: 'media',
      id: fileId
    })

    if (!mediaDoc || !mediaDoc.url) {
      throw new Error('Fichier introuvable')
    }

    // Lire le contenu du fichier
    let fileContent: string
    try {
      if (mediaDoc.url.startsWith('/')) {
        // Fichier local
        const fs = await import('fs/promises')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'public', mediaDoc.url)
        fileContent = await fs.readFile(filePath, 'utf-8')
      } else {
        // Fichier distant
        const response = await fetch(mediaDoc.url)
        if (!response.ok) {
          throw new Error(`Erreur téléchargement: ${response.statusText}`)
        }
        fileContent = await response.text()
      }
    } catch (error) {
      throw new Error(`Erreur lecture fichier: ${error instanceof Error ? error.message : String(error)}`)
    }

    console.log(`✅ [Import] File loaded: ${fileContent.length} characters`)

    // Traiter selon le type
    let result: ImportJobResult

    if (importType === 'csv') {
      result = await processCSVImport(fileContent, payload, options, importJobId)
    } else {
      result = await processJSONImport(fileContent, payload, importType, options, importJobId, userId)
    }

    // Mettre à jour le statut final
    await payload.update({
      collection: 'import-jobs',
      id: importJobId,
      data: {
        status: result.success ? 'completed' : 'failed',
        progress: {
          total: result.totalItems,
          processed: result.processedItems,
          successful: result.successfulItems,
          failed: result.failedItems
        },
        errors: result.errors || [],
        completedAt: new Date().toISOString()
      }
    })

    console.log(`✅ [Import] Job ${importJobId} completed: ${result.successfulItems}/${result.totalItems} items`)

    return result

  } catch (error) {
    console.error(`❌ [Import] Job ${importJobId} failed:`, error)

    // Mettre à jour le statut à "failed"
    await payload.update({
      collection: 'import-jobs',
      id: importJobId,
      data: {
        status: 'failed',
        errors: [{
          type: 'system',
          severity: 'critical',
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
 * Traiter un import CSV
 */
async function processCSVImport(
  fileContent: string,
  payload: any,
  options: ImportJobData['options'],
  importJobId: string
): Promise<ImportJobResult> {
  const csvService = new CSVImportService()

  // Validation
  await payload.update({
    collection: 'import-jobs',
    id: importJobId,
    data: { status: 'validating' }
  })

  const validationResult = await csvService.validateCSV(fileContent)

  if (!validationResult.isValid) {
    return {
      success: false,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      errors: validationResult.errors.map(err => ({
        type: 'validation',
        severity: 'critical',
        message: err.message,
        suggestion: err.suggestion || 'Corrigez les erreurs dans votre fichier CSV'
      }))
    }
  }

  // Mode test
  if (options.dryRun) {
    return {
      success: true,
      totalItems: validationResult.questions?.length || 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0
    }
  }

  // Import réel
  const result = await csvService.processCSV(fileContent, payload, options.batchSize || 100)

  return {
    success: result.success,
    totalItems: result.total,
    processedItems: result.processed,
    successfulItems: result.successful,
    failedItems: result.failed,
    errors: result.errors?.map(err => ({
      type: 'database',
      severity: 'major',
      message: err.message || String(err),
      suggestion: 'Vérifiez les données et réessayez'
    }))
  }
}

/**
 * Traiter un import JSON
 */
async function processJSONImport(
  fileContent: string,
  payload: any,
  importType: string,
  options: ImportJobData['options'],
  importJobId: string,
  userId: string
): Promise<ImportJobResult> {
  const validationService = new JSONValidationService()
  const batchService = new BatchProcessingService()

  // Parser le JSON
  let jsonData
  try {
    jsonData = JSON.parse(fileContent)
  } catch (error) {
    return {
      success: false,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      errors: [{
        type: 'validation',
        severity: 'critical',
        message: 'Fichier JSON invalide',
        suggestion: 'Vérifiez la syntaxe de votre fichier JSON'
      }]
    }
  }

  // Validation
  await payload.update({
    collection: 'import-jobs',
    id: importJobId,
    data: { status: 'validating' }
  })

  const validationResult = await validationService.validateImportData(jsonData)

  if (!validationResult.isValid) {
    return {
      success: false,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      errors: validationResult.errors.map(err => ({
        type: err.type || 'validation',
        severity: err.severity || 'major',
        message: err.message,
        suggestion: err.suggestion || 'Corrigez les erreurs dans votre fichier'
      }))
    }
  }

  // Mode test
  if (options.dryRun) {
    const itemCount = jsonData.questions?.length || 
                     jsonData.flashcards?.length || 
                     jsonData.paths?.length || 0

    await payload.update({
      collection: 'import-jobs',
      id: importJobId,
      data: { status: 'preview' }
    })

    return {
      success: true,
      totalItems: itemCount,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0
    }
  }

  // Import réel
  await batchService.initializeServices(payload)

  const result = await batchService.startProcessing(
    importJobId,
    jsonData,
    userId,
    {
      batchSize: options.batchSize || 100,
      dryRun: false,
      overwriteExisting: options.overwriteExisting || false
    }
  )

  return {
    success: result.status === 'completed',
    totalItems: result.totalItems,
    processedItems: result.processedItems,
    successfulItems: result.successfulItems,
    failedItems: result.failedItems,
    errors: result.errors?.map(err => ({
      type: 'database',
      severity: 'major',
      message: err.message || String(err),
      suggestion: 'Vérifiez les données et réessayez'
    }))
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
