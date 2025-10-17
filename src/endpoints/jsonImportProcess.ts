/**
 * Endpoint pour traiter un job d'import JSON/CSV
 * Connecte la collection ImportJobs aux services d'import existants
 */

import type { PayloadHandler } from 'payload'
import { JSONValidationService } from '../services/JSONValidationService'
import { JSONProcessingService } from '../services/JSONProcessingService'
import { BatchProcessingService } from '../services/BatchProcessingService'
import { CSVImportService } from '../services/CSVImportService'

export const jsonImportProcessEndpoint: PayloadHandler = async (req) => {
  const { payload, user } = req
  const jobId = req.routeParams?.jobId

  console.log(`🔄 Traitement du job d'import: ${jobId}`)

  // Vérifier l'authentification
  if (!user) {
    return Response.json(
      { success: false, error: 'Authentification requise' },
      { status: 401 }
    )
  }

  // Vérifier que le jobId est fourni
  if (!jobId) {
    return Response.json(
      { success: false, error: 'Job ID requis' },
      { status: 400 }
    )
  }

  try {
    // Récupérer le job d'import
    const job = await payload.findByID({
      collection: 'import-jobs',
      id: jobId
    })

    if (!job) {
      return Response.json(
        { success: false, error: 'Job d\'import introuvable' },
        { status: 404 }
      )
    }

    // Vérifier que l'utilisateur a accès à ce job
    if (user.role !== 'admin' && job.importedBy !== user.id) {
      return Response.json(
        { success: false, error: 'Accès non autorisé à ce job' },
        { status: 403 }
      )
    }

    // Vérifier que le job est en attente
    if (job.status !== 'queued') {
      return Response.json(
        { 
          success: false, 
          error: `Le job est déjà en cours de traitement (statut: ${job.status})` 
        },
        { status: 400 }
      )
    }

    // Récupérer le fichier uploadé
    if (!job.originalFile) {
      return Response.json(
        { success: false, error: 'Aucun fichier à traiter' },
        { status: 400 }
      )
    }

    // Récupérer le document media
    const mediaId = typeof job.originalFile === 'string' ? job.originalFile : job.originalFile.id
    const mediaDoc = await payload.findByID({
      collection: 'media',
      id: mediaId
    })

    if (!mediaDoc || !mediaDoc.url) {
      return Response.json(
        { success: false, error: 'Fichier introuvable' },
        { status: 404 }
      )
    }

    // Mettre à jour le statut à "processing"
    await payload.update({
      collection: 'import-jobs',
      id: jobId,
      data: {
        status: 'processing'
      }
    })

    console.log(`📄 Fichier à traiter: ${mediaDoc.filename}`)

    // Lire le contenu du fichier
    let fileContent: string
    try {
      // Si le fichier est local, le lire depuis le système de fichiers
      if (mediaDoc.url.startsWith('/')) {
        const fs = await import('fs/promises')
        const path = await import('path')
        const filePath = path.join(process.cwd(), 'public', mediaDoc.url)
        fileContent = await fs.readFile(filePath, 'utf-8')
      } else {
        // Si le fichier est distant, le télécharger
        const response = await fetch(mediaDoc.url)
        if (!response.ok) {
          throw new Error(`Erreur téléchargement fichier: ${response.statusText}`)
        }
        fileContent = await response.text()
      }
    } catch (error) {
      console.error('❌ Erreur lecture fichier:', error)
      await payload.update({
        collection: 'import-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errors: [{
            type: 'system',
            severity: 'critical',
            message: `Erreur lors de la lecture du fichier: ${error.message}`,
            suggestion: 'Vérifiez que le fichier est accessible et valide'
          }],
          completedAt: new Date().toISOString()
        }
      })
      
      return Response.json(
        { success: false, error: 'Erreur lors de la lecture du fichier' },
        { status: 500 }
      )
    }

    // Traiter selon le type d'import
    const importType = job.importType
    const options = job.importOptions || {}

    console.log(`📊 Type d'import: ${importType}`)
    console.log(`⚙️ Options:`, options)

    try {
      if (importType === 'csv') {
        // Traitement CSV
        const csvService = new CSVImportService()
        
        // Mettre à jour le statut à "validating"
        await payload.update({
          collection: 'import-jobs',
          id: jobId,
          data: { status: 'validating' }
        })

        const validationResult = await csvService.validateCSV(fileContent)
        
        if (!validationResult.isValid) {
          await payload.update({
            collection: 'import-jobs',
            id: jobId,
            data: {
              status: 'failed',
              validationResult,
              errors: validationResult.errors.map(err => ({
                type: 'validation',
                severity: 'critical',
                message: err.message,
                suggestion: err.suggestion || 'Corrigez les erreurs dans votre fichier CSV'
              })),
              completedAt: new Date().toISOString()
            }
          })
          
          return Response.json({
            success: false,
            error: 'Validation CSV échouée',
            validationResult
          }, { status: 400 })
        }

        // Si mode test, ne pas importer
        if (options.dryRun) {
          await payload.update({
            collection: 'import-jobs',
            id: jobId,
            data: {
              status: 'preview',
              validationResult,
              progress: {
                total: validationResult.questions?.length || 0,
                processed: 0,
                successful: 0,
                failed: 0
              }
            }
          })
          
          return Response.json({
            success: true,
            message: 'Validation réussie (mode test)',
            validationResult,
            preview: validationResult.questions?.slice(0, 5)
          })
        }

        // Import réel
        const result = await csvService.processCSV(
          fileContent,
          payload,
          options.batchSize || 100
        )

        await payload.update({
          collection: 'import-jobs',
          id: jobId,
          data: {
            status: result.success ? 'completed' : 'failed',
            progress: {
              total: result.total,
              processed: result.processed,
              successful: result.successful,
              failed: result.failed
            },
            errors: result.errors?.map(err => ({
              type: 'database',
              severity: 'major',
              message: err.message || String(err),
              suggestion: 'Vérifiez les données et réessayez'
            })),
            completedAt: new Date().toISOString()
          }
        })

        return Response.json({
          success: result.success,
          message: `Import terminé: ${result.successful}/${result.total} éléments importés`,
          result
        })

      } else {
        // Traitement JSON (questions, flashcards, learning-paths)
        const validationService = new JSONValidationService()
        const processingService = new JSONProcessingService()
        
        // Parser le JSON
        let jsonData
        try {
          jsonData = JSON.parse(fileContent)
        } catch (error) {
          await payload.update({
            collection: 'import-jobs',
            id: jobId,
            data: {
              status: 'failed',
              errors: [{
                type: 'validation',
                severity: 'critical',
                message: 'Fichier JSON invalide',
                suggestion: 'Vérifiez la syntaxe de votre fichier JSON'
              }],
              completedAt: new Date().toISOString()
            }
          })
          
          return Response.json({
            success: false,
            error: 'Fichier JSON invalide'
          }, { status: 400 })
        }

        // Validation
        await payload.update({
          collection: 'import-jobs',
          id: jobId,
          data: { status: 'validating' }
        })

        const validationResult = await validationService.validateImportData(jsonData)
        
        if (!validationResult.isValid) {
          await payload.update({
            collection: 'import-jobs',
            id: jobId,
            data: {
              status: 'failed',
              validationResult,
              errors: validationResult.errors.map(err => ({
                type: err.type || 'validation',
                severity: err.severity || 'major',
                message: err.message,
                suggestion: err.suggestion || 'Corrigez les erreurs dans votre fichier'
              })),
              completedAt: new Date().toISOString()
            }
          })
          
          return Response.json({
            success: false,
            error: 'Validation échouée',
            validationResult
          }, { status: 400 })
        }

        // Si mode test, ne pas importer
        if (options.dryRun) {
          const itemCount = jsonData.questions?.length || 
                           jsonData.flashcards?.length || 
                           jsonData.paths?.length || 0

          await payload.update({
            collection: 'import-jobs',
            id: jobId,
            data: {
              status: 'preview',
              validationResult,
              progress: {
                total: itemCount,
                processed: 0,
                successful: 0,
                failed: 0
              }
            }
          })
          
          return Response.json({
            success: true,
            message: 'Validation réussie (mode test)',
            validationResult,
            preview: jsonData.questions?.slice(0, 5) || 
                    jsonData.flashcards?.slice(0, 5) ||
                    jsonData.paths?.slice(0, 2)
          })
        }

        // Import réel avec BatchProcessingService
        const batchService = new BatchProcessingService()
        await batchService.initializeServices(payload)

        const result = await batchService.startProcessing(
          jobId,
          jsonData,
          user.id,
          {
            batchSize: options.batchSize || 100,
            dryRun: false,
            overwriteExisting: options.overwriteExisting || false
          }
        )

        await payload.update({
          collection: 'import-jobs',
          id: jobId,
          data: {
            status: result.status === 'completed' ? 'completed' : 'failed',
            progress: {
              total: result.totalItems,
              processed: result.processedItems,
              successful: result.successfulItems,
              failed: result.failedItems
            },
            errors: result.errors?.map(err => ({
              type: 'database',
              severity: 'major',
              message: err.message || String(err),
              suggestion: 'Vérifiez les données et réessayez'
            })),
            completedAt: new Date().toISOString()
          }
        })

        return Response.json({
          success: result.status === 'completed',
          message: `Import terminé: ${result.successfulItems}/${result.totalItems} éléments importés`,
          result
        })
      }

    } catch (error) {
      console.error('❌ Erreur traitement:', error)
      
      await payload.update({
        collection: 'import-jobs',
        id: jobId,
        data: {
          status: 'failed',
          errors: [{
            type: 'system',
            severity: 'critical',
            message: error.message || 'Erreur interne lors du traitement',
            suggestion: 'Contactez l\'administrateur si le problème persiste'
          }],
          completedAt: new Date().toISOString()
        }
      })

      return Response.json(
        { success: false, error: 'Erreur lors du traitement' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Erreur critique:', error)
    return Response.json(
      { success: false, error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
