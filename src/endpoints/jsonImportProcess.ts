/**
 * Endpoint pour traiter un job d'import JSON/CSV
 * Utilise ImportJobProcessingService pour la logique métier
 */

import type { PayloadHandler } from 'payload'
import { ImportJobProcessingService } from '../services/ImportJobProcessingService'

export const jsonImportProcessEndpoint: PayloadHandler = async (req) => {
  const { payload, user } = req
  const jobId = req.routeParams?.jobId

  console.log(`🔄 [Endpoint] Traitement du job d'import: ${jobId}`)

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

  const importService = new ImportJobProcessingService()

  try {
    // Appeler le service de traitement
    const result = await importService.processImportJob(payload, jobId, user.id)

    return Response.json({
      success: result.success,
      message: `Import terminé: ${result.successfulItems}/${result.totalItems} éléments importés`,
      result
    })

  } catch (error) {
    console.error('❌ [Endpoint] Erreur critique:', error)
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur interne du serveur'
      },
      { status: 500 }
    )
  }
}
