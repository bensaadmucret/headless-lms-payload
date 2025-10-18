/**
 * Endpoint pour déclencher manuellement le traitement d'un import
 */

import type { PayloadHandler } from 'payload'

export const triggerImportProcessing: PayloadHandler = async (req) => {
  const { payload, user } = req
  const jobId = req.routeParams?.jobId

  console.log(`🔄 Déclenchement manuel du traitement pour job: ${jobId}`)

  // Vérifier l'authentification
  if (!user) {
    return Response.json(
      { success: false, error: 'Authentification requise' },
      { status: 401 }
    )
  }

  if (!jobId) {
    return Response.json(
      { success: false, error: 'Job ID requis' },
      { status: 400 }
    )
  }

  try {
    // Récupérer le job
    const job = await payload.findByID({
      collection: 'import-jobs',
      id: jobId as string
    })

    if (!job) {
      return Response.json(
        { success: false, error: 'Job introuvable' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (user.role !== 'admin' && user.role !== 'superadmin' && job.importedBy !== user.id) {
      return Response.json(
        { success: false, error: 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Vérifier qu'il y a un fichier
    if (!job.originalFile) {
      return Response.json(
        { success: false, error: 'Aucun fichier à traiter' },
        { status: 400 }
      )
    }

    // Réinitialiser le statut à "queued" si nécessaire
    if (job.status !== 'queued') {
      await payload.update({
        collection: 'import-jobs',
        id: jobId as string,
        data: {
          status: 'queued',
          errors: [],
          progress: {
            total: 0,
            processed: 0,
            successful: 0,
            failed: 0
          }
        }
      })
    }

    // Appeler l'endpoint de traitement
    const serverUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
    const response = await fetch(`${serverUrl}/api/json-import/process/${jobId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur lors du déclenchement:', errorText)
      return Response.json(
        { success: false, error: 'Erreur lors du déclenchement du traitement', details: errorText },
        { status: 500 }
      )
    }

    console.log('✅ Traitement déclenché avec succès')
    return Response.json({
      success: true,
      message: 'Traitement déclenché avec succès',
      jobId
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return Response.json(
      { success: false, error: 'Erreur interne', details: errorMessage },
      { status: 500 }
    )
  }
}
