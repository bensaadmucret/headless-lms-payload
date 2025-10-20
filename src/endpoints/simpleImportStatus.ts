import type { Endpoint } from 'payload'

/**
 * Endpoint simple pour vérifier le statut des imports
 */
export const simpleImportStatusEndpoint: Endpoint = {
  path: '/simple-import-status',
  method: 'get',
  handler: async (req) => {
    try {
      if (!req.user) {
        return Response.json({
          success: false,
          error: 'Authentification requise'
        }, { status: 401 })
      }

      // Récupérer les derniers import jobs
      const importJobs = await req.payload.find({
        collection: 'import-jobs',
        limit: 10,
        sort: '-createdAt'
      })

      return Response.json({
        success: true,
        data: {
          totalJobs: importJobs.totalDocs,
          recentJobs: importJobs.docs.map(job => ({
            id: job.id,
            fileName: job.fileName,
            status: job.status,
            progress: job.progress,
            importType: job.importType,
            createdAt: job.createdAt
          }))
        }
      })
    } catch (error) {
      console.error('Erreur simple import status:', error)
      return Response.json({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }, { status: 500 })
    }
  }
}