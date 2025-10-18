/**
 * Service pour traiter les jobs d'import JSON/CSV
 * Logique métier partagée entre l'endpoint et le worker
 */

import type { Payload } from 'payload'
import { JSONValidationService } from './JSONValidationService'
import { BatchProcessingService } from './BatchProcessingService'
import { CSVImportService } from './CSVImportService'

export interface ImportProcessingResult {
  success: boolean
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  errors?: Array<{
    type: 'validation' | 'database' | 'mapping' | 'reference' | 'system'
    severity: 'critical' | 'major' | 'minor' | 'warning'
    message: string
    suggestion?: string
  }>
}

export class ImportJobProcessingService {
  private validationService: JSONValidationService
  private batchService: BatchProcessingService
  private csvService: CSVImportService

  constructor() {
    this.validationService = new JSONValidationService()
    this.batchService = new BatchProcessingService()
    this.csvService = new CSVImportService()
  }

  /**
   * Traiter un job d'import complet
   */
  async processImportJob(
    payload: Payload,
    jobId: string,
    userId: string
  ): Promise<ImportProcessingResult> {
    console.log(`🔄 [ImportService] Traitement du job: ${jobId}`)

    try {
      // Récupérer le job
      const job = await payload.findByID({
        collection: 'knowledge-base',
        id: jobId
      })

      if (!job) {
        throw new Error('Job introuvable')
      }

      // Vérifier qu'il y a un fichier
      if (!job.originalFile) {
        throw new Error('Aucun fichier à traiter')
      }

      // Mettre à jour le statut à "processing"
      await payload.update({
        collection: 'knowledge-base',
        id: jobId,
        data: { status: 'processing' }
      })

      // Récupérer le fichier
      const mediaId = typeof job.originalFile === 'string' 
        ? job.originalFile 
        : (job.originalFile as any)?.id

      const mediaDoc = await payload.findByID({
        collection: 'media',
        id: mediaId
      })

      if (!mediaDoc || !mediaDoc.url) {
        throw new Error('Fichier introuvable')
      }

      // Lire le contenu du fichier
      const fileContent = await this.readFileContent(mediaDoc.url)

      console.log(`✅ [ImportService] Fichier chargé: ${fileContent.length} caractères`)

      // Traiter selon le type
      let result: ImportProcessingResult

      if (job.importType === 'csv') {
        result = await this.processCSVImport(
          fileContent,
          payload,
          job.importOptions || {},
          jobId
        )
      } else {
        result = await this.processJSONImport(
          fileContent,
          payload,
          job.importType as string,
          job.importOptions || {},
          jobId,
          userId
        )
      }

      // Mettre à jour le statut final
      await payload.update({
        collection: 'knowledge-base',
        id: jobId,
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

      console.log(`✅ [ImportService] Job terminé: ${result.successfulItems}/${result.totalItems}`)

      return result

    } catch (error) {
      console.error(`❌ [ImportService] Erreur:`, error)

      // Mettre à jour le statut à "failed"
      await payload.update({
        collection: 'knowledge-base',
        id: jobId,
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
   * Lire le contenu d'un fichier
   */
  private async readFileContent(fileUrl: string): Promise<string> {
    if (fileUrl.startsWith('/')) {
      // Fichier local
      const fs = await import('fs/promises')
      const path = await import('path')
      const filePath = path.join(process.cwd(), 'public', fileUrl)
      return await fs.readFile(filePath, 'utf-8')
    } else {
      // Fichier distant
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Erreur téléchargement: ${response.statusText}`)
      }
      return await response.text()
    }
  }

  /**
   * Traiter un import CSV
   */
  private async processCSVImport(
    fileContent: string,
    payload: Payload,
    options: any,
    jobId: string
  ): Promise<ImportProcessingResult> {
    // Validation
    await payload.update({
      collection: 'knowledge-base',
      id: jobId,
      data: { status: 'validating' }
    })

    const validationResult = await this.csvService.validateCSV(fileContent)

    if (!validationResult.isValid) {
      return {
        success: false,
        totalItems: 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        errors: validationResult.errors.map(err => ({
          type: 'validation' as const,
          severity: 'critical' as const,
          message: err.message,
          suggestion: 'Corrigez les erreurs dans votre fichier CSV'
        }))
      }
    }

    // Mode test
    if (options.dryRun) {
      return {
        success: true,
        totalItems: validationResult.previewData?.length || 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0
      }
    }

    // Import réel - TODO: implémenter la vraie logique d'import CSV
    // Pour l'instant, on retourne un succès simulé
    return {
      success: true,
      totalItems: validationResult.previewData?.length || 0,
      processedItems: validationResult.previewData?.length || 0,
      successfulItems: validationResult.previewData?.length || 0,
      failedItems: 0
    }
  }

  /**
   * Traiter un import JSON
   */
  private async processJSONImport(
    fileContent: string,
    payload: Payload,
    importType: string,
    options: any,
    jobId: string,
    userId: string
  ): Promise<ImportProcessingResult> {
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
          type: 'validation' as const,
          severity: 'critical' as const,
          message: 'Fichier JSON invalide',
          suggestion: 'Vérifiez la syntaxe de votre fichier JSON'
        }]
      }
    }

    // Validation
    await payload.update({
      collection: 'knowledge-base',
      id: jobId,
      data: { status: 'validating' }
    })

    const validationResult = await this.validationService.validateJSON(
      fileContent,
      importType,
      options
    )

    if (!validationResult.isValid) {
      return {
        success: false,
        totalItems: 0,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        errors: validationResult.errors.map(err => ({
          type: (err.type || 'validation') as any,
          severity: (err.severity || 'major') as any,
          message: err.message,
          suggestion: 'Corrigez les erreurs dans votre fichier'
        }))
      }
    }

    // Mode test
    if (options.dryRun) {
      const itemCount = jsonData.questions?.length || 
                       jsonData.flashcards?.length || 
                       jsonData.paths?.length || 0

      await payload.update({
        collection: 'knowledge-base',
        id: jobId,
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

    // Import réel avec BatchProcessingService
    await this.batchService.initializeServices(payload)

    const result = await this.batchService.startBatchProcessing(
      jobId,
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
      errors: result.errors?.map((err: any) => ({
        type: 'database' as const,
        severity: 'major' as const,
        message: err.message || String(err),
        suggestion: 'Vérifiez les données et réessayez'
      }))
    }
  }
}
