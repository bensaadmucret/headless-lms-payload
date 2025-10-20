/**
 * Endpoint pour récupérer le statut d'un import en cours
 * GET /api/import-status/:jobId
 */

import type { Response } from 'express'
import type { ExtendedPayloadRequest } from '../types/payload-types-extended'

export const getImportStatus = async (req: ExtendedPayloadRequest, res: Response) => {
  const { payload, user } = req
  const jobId = req.routeParams?.jobId

  // Vérification de l'authentification
  if (!user) {
    res.status(401).json({
      error: 'Authentification requise'
    })
    return
  }

  if (!jobId) {
    res.status(400).json({
      error: 'ID du job d\'import manquant'
    })
    return
  }

  try {
    // Récupérer le job d'import
    const importJob = await payload.findByID({
      collection: 'import-jobs',
      id: String(jobId),
    })

    if (!importJob) {
      res.status(404).json({
        error: `Job d'import introuvable avec l'ID: ${jobId}`
      })
      return
    }

    // Vérifier les permissions (l'utilisateur doit être admin ou propriétaire du job)
    const uploadedById = typeof importJob.uploadedBy === 'object' 
      ? importJob.uploadedBy.id 
      : importJob.uploadedBy

    if (
      user.role !== 'admin' && 
      user.role !== 'superadmin' && 
      String(uploadedById) !== String(user.id)
    ) {
      res.status(403).json({
        error: 'Accès non autorisé à ce job d\'import'
      })
      return
    }

    // Retourner le statut détaillé
    res.json({
      success: true,
      data: {
        id: importJob.id,
        fileName: importJob.fileName,
        importType: importJob.importType,
        status: importJob.status,
        progress: importJob.progress,
        createdAt: importJob.createdAt,
        completedAt: importJob.completedAt,
        validationResults: importJob.validationResults,
        processingResults: importJob.processingResults,
        errors: importJob.errors,
      },
    })
  } catch (error) {
    payload.logger.error('Erreur lors de la récupération du statut d\'import:', error)
    
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
