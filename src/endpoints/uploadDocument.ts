import type { Endpoint } from 'payload'
import { addExtractionJob } from '../jobs/queue'

export const uploadDocumentEndpoint: Endpoint = {
  path: '/knowledge-base/upload',
  method: 'post',
  handler: async (req, res) => {
    try {
      console.log('📤 Début upload de document (mode asynchrone)...')
      
      // 1. Vérifier l'authentification
      if (!req.user) {
        return res.status(401).json({ 
          success: false,
          error: 'Authentification requise' 
        })
      }
      
      // 2. Vérifier qu'un fichier a été uploadé
      if (!req.files || !req.files.document) {
        return res.status(400).json({
          success: false,
          error: 'Aucun fichier fourni. Utilisez le champ "document".'
        })
      }
      
      const uploadedFile = Array.isArray(req.files.document) 
        ? req.files.document[0] 
        : req.files.document
      
      console.log(`📄 Fichier reçu: ${uploadedFile.name} (${uploadedFile.size} bytes)`)
      
      // 3. Valider le type de fichier
      const documentType = detectDocumentType(uploadedFile.name)
      
      if (!['pdf', 'epub', 'docx', 'txt'].includes(documentType)) {
        return res.status(400).json({
          success: false,
          error: `Type de fichier non supporté: ${documentType}. Formats acceptés: PDF, EPUB, DOCX, TXT`
        })
      }
      
      // 4. Créer l'entrée media d'abord
      console.log('💾 Sauvegarde du fichier dans Media...')
      
      const mediaDoc = await req.payload.create({
        collection: 'media',
        data: {
          alt: `Document: ${uploadedFile.name}`,
          user: req.user.id,
        },
        file: {
          data: uploadedFile.data,
          mimetype: uploadedFile.mimetype,
          name: uploadedFile.name,
          size: uploadedFile.size,
        }
      })
      
      console.log(`✅ Fichier sauvegardé avec l'ID: ${mediaDoc.id}`)
      
      // 5. Créer l'entrée Knowledge Base vide avec le statut "en attente"
      console.log('💾 Création de l\'entrée Knowledge Base initiale...')
      
      // Extraire un titre à partir du nom de fichier
      const title = uploadedFile.name.replace(/\.[^/.]+$/, '')
      
      // Créer le document initial avec un statut de traitement en attente
      const knowledgeDoc = await req.payload.create({
        collection: 'knowledge-base',
        data: {
          // Métadonnées du document
          title,
          originalFileName: uploadedFile.name,
          documentType,
          sourceFile: mediaDoc.id,
          
          // Statuts (important)
          processingStatus: 'queued', // Status initial = en attente de traitement
          validationStatus: 'pending',
          isActive: false, // Nécessite validation manuelle
          uploadedBy: req.user.id,
          
          // Valeurs par défaut en attendant le traitement
          medicalDomain: 'autre',
          difficulty: 'intermediate',
          
          // Statistiques initiales
          usageStats: {
            questionsGenerated: 0,
            timesReferenced: 0,
          },
          
          // Logs initiaux
          processingLogs: JSON.stringify({
            queuedAt: new Date().toISOString(),
            documentType,
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            status: 'queued',
            message: 'Document placé en file d\'attente pour traitement asynchrone',
          }, null, 2),
        }
      })
      
      console.log(`✅ Document créé avec l'ID: ${knowledgeDoc.id}`)
      
      // 6. Ajouter le job à la file d'attente pour traitement asynchrone
      console.log('🧵 Ajout du document à la file d\'attente de traitement...')
      
      await addExtractionJob({
        type: 'document-extraction',
        documentId: knowledgeDoc.id,
        fileType: documentType,
        sourceFileId: mediaDoc.id,
        sourceFileUrl: `/api/media/file/${uploadedFile.name}`,
        userId: req.user.id,
        priority: 'high',
      })
      
      console.log(`🎉 Document placé en file d'attente avec succès! ID: ${knowledgeDoc.id}`)
      
      // 8. Réponse de succès immédiate
      return res.status(202).json({ // 202 Accepted - La requête a été acceptée pour traitement
        success: true,
        message: 'Document accepté et placé en file d\'attente pour traitement',
        data: {
          knowledgeBaseId: knowledgeDoc.id,
          mediaId: mediaDoc.id,
          title,
          documentType,
          processingStatus: 'queued',
          queuedAt: new Date().toISOString(),
          estimatedProcessingTime: '2-5 minutes',
          statusEndpoint: `/api/knowledge-base/${knowledgeDoc.id}/status`, // Endpoint pour vérifier le statut
          nextSteps: [
            'Le document a été mis en file d\'attente pour traitement',
            'Vous pouvez vérifier son statut via l\'endpoint status',
            'Une fois traité, le document sera disponible pour validation par un expert'
          ]
        }
      })
      
    } catch (error) {
      console.error('💥 Erreur critique dans uploadDocument:', error)
      
      return res.status(500).json({
        success: false,
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString(),
      })
    }
  },
}

/**
 * Détecter le type de document à partir du nom de fichier
 */
function detectDocumentType(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop()
  
  switch (extension) {
    case 'pdf':
      return 'pdf'
    case 'epub':
      return 'epub'
    case 'docx':
    case 'doc':
      return 'docx'
    case 'txt':
      return 'txt'
    default:
      return 'unknown'
  }
}

/**
 * Endpoint pour obtenir le statut d'un traitement
 */
export const getProcessingStatusEndpoint: Endpoint = {
  path: '/knowledge-base/:id/status',
  method: 'get',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise' })
      }
      
      const { id } = req.params
      
      // 1. Récupérer l'état dans la base
      const doc = await req.payload.findByID({
        collection: 'knowledge-base',
        id: id,
        depth: 1,
      })
      
      if (!doc) {
        return res.status(404).json({ error: 'Document non trouvé' })
      }
      
      // 2. Simuler un progrès basé sur le statut
      let progress = 0
      let estimatedTime = '2-5 minutes'
      
      switch (doc.processingStatus) {
        case 'queued':
          progress = 5
          estimatedTime = '3-5 minutes'
          break
        case 'extracting':
          progress = 30
          estimatedTime = '2-3 minutes'
          break
        case 'enriching':
          progress = 70
          estimatedTime = '1-2 minutes'
          break
        case 'updating':
          progress = 90
          estimatedTime = 'Quelques secondes'
          break
        case 'completed':
          progress = 100
          estimatedTime = 'Terminé'
          break
        case 'failed':
          progress = 0
          estimatedTime = 'Erreur'
          break
      }
      
      // 3. Construire la réponse complète
      return res.json({
        success: true,
        data: {
          id: doc.id,
          title: doc.title,
          fileName: doc.originalFileName,
          documentType: doc.documentType,
          processingStatus: doc.processingStatus,
          validationStatus: doc.validationStatus,
          isActive: doc.isActive,
          lastProcessed: doc.lastProcessed,
          uploadedAt: doc.createdAt,
          processingLogs: doc.processingLogs,
          
          // Extraction et enrichissement (si disponibles)
          extraction: {
            hasContent: !!doc.extractedContent,
            textLength: doc.extractedContent?.length || 0,
            chaptersCount: doc.chapters?.length || 0,
          },
          
          enrichment: {
            hasKeywords: (doc.keywords?.length || 0) > 0,
            keywordsCount: doc.keywords?.length || 0,
            medicalDomain: doc.medicalDomain,
            hasSummary: !!doc.aiSummary,
          },
          
          // Progression et temps estimé
          progress: progress,
          estimatedTimeRemaining: estimatedTime,
        }
      })
      
    } catch (error) {
      console.error('Erreur getProcessingStatus:', error)
      return res.status(500).json({ 
        error: 'Erreur interne', 
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      })
    }
  },
}

/**
 * Endpoint pour retraiter un document
 */
export const reprocessDocumentEndpoint: Endpoint = {
  path: '/knowledge-base/:id/reprocess',
  method: 'post',
  handler: async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentification requise' })
      }
      
      const { id } = req.params
      
      // Récupérer le document existant
      const existingDoc = await req.payload.findByID({
        collection: 'knowledge-base',
        id: id,
        depth: 1,
      })
      
      if (!existingDoc || !existingDoc.sourceFile) {
        return res.status(404).json({ error: 'Document ou fichier source non trouvé' })
      }
      
      // Vérifier s'il n'est pas déjà en traitement
      if (['queued', 'extracting', 'enriching', 'updating', 'processing'].includes(existingDoc.processingStatus)) {
        return res.status(409).json({ 
          error: 'Document déjà en cours de traitement',
          currentStatus: existingDoc.processingStatus
        })
      }
      
      // Marquer comme en cours de retraitement
      await req.payload.update({
        collection: 'knowledge-base',
        id: id,
        data: {
          processingStatus: 'queued',
          processingLogs: JSON.stringify({
            reprocessQueuedAt: new Date().toISOString(),
            initiatedBy: req.user.email,
            previousState: existingDoc.processingStatus,
            message: 'Retraitement initié et placé en file d\'attente'
          }, null, 2),
        }
      })
      
      // Ajouter à la file d'attente pour retraitement
      await addExtractionJob({
        type: 'document-extraction',
        documentId: id,
        fileType: existingDoc.documentType,
        sourceFileId: existingDoc.sourceFile.id,
        sourceFileUrl: `/api/media/file/${existingDoc.originalFileName}`,
        userId: req.user.id,
        priority: 'normal',
      })
      
      return res.json({
        success: true,
        message: 'Retraitement placé en file d\'attente',
        data: {
          documentId: id,
          status: 'queued',
          queuedAt: new Date().toISOString(),
          estimatedTime: '2-5 minutes',
          statusEndpoint: `/api/knowledge-base/${id}/status`
        }
      })
      
    } catch (error) {
      console.error('Erreur reprocessDocument:', error)
      return res.status(500).json({ 
        error: 'Erreur interne', 
        details: error instanceof Error ? error.message : 'Erreur inconnue' 
      })
    }
  },
}
