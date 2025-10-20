import type { PayloadHandler } from 'payload'
import type { ImportType } from '../types/jsonImport'

// Endpoint pour déclencher un import de questions/quiz depuis un fichier JSON
export const triggerImport = async (req, res) => {
  try {
    const { payload, user } = req

    // Vérification des permissions
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        error: 'Accès non autorisé. Seuls les administrateurs peuvent déclencher des imports.'
      })
    }

    const { uploadedFileId, fileName, importType, createQuizContainer = false, quizMetadata = {} } = req.body

    // Validation des données
    if (!uploadedFileId || !fileName || !importType) {
      return res.status(400).json({
        error: 'Données manquantes : uploadedFileId, fileName et importType sont requis'
      })
    }

    // Vérifier que le fichier existe
    const mediaFile = await payload.findByID({
      collection: 'media',
      id: String(uploadedFileId),
    })

    if (!mediaFile) {
      return res.status(404).json({
        error: `Fichier média introuvable avec l'ID: ${uploadedFileId}`
      })
    }

    // Créer le job d'import
    const importJob = await payload.create({
      collection: 'import-jobs',
      data: {
        uploadedFile: typeof uploadedFileId === 'number' ? uploadedFileId : parseInt(String(uploadedFileId), 10),
        fileName,
        importType,
        status: 'pending',
        progress: 0,
        uploadedBy: user.id,
        createQuizContainer,
        quizMetadata: quizMetadata.title || quizMetadata.description || quizMetadata.category ? {
          title: quizMetadata.title || null,
          description: quizMetadata.description || null,
          category: quizMetadata.category ? (typeof quizMetadata.category === 'number' ? quizMetadata.category : parseInt(String(quizMetadata.category), 10)) : null,
        } : {},
      },
    })

    return res.json({
      success: true,
      message: 'Import déclenché avec succès',
      data: {
        importJobId: importJob.id,
        status: importJob.status,
        fileName: importJob.fileName,
        importType: importJob.importType,
      },
    })
  } catch (error) {
    req.payload.logger.error('Erreur lors du déclenchement de l\'import:', error)
    
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    })
  }
}
