import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
import { addExtractionJob } from '../jobs/queue'

/**
 * Hook qui se déclenche après la création/modification d'un document Knowledge Base
 * 
 * Ce hook :
 * 1. Détecte si un nouveau fichier a été uploadé
 * 2. Lance automatiquement le traitement asynchrone
 * 3. Met à jour le statut du document
 */
export const processDocumentAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  previousDoc,
}) => {
  try {
    console.log(`🔄 Hook processDocumentAfterChange: ${operation} - ${doc.id}`)

    // Ne traiter que les créations ou les mises à jour avec nouveau fichier
    const shouldProcess = 
      operation === 'create' || // Nouvelle création
      (operation === 'update' && doc.sourceFile && doc.sourceFile !== previousDoc?.sourceFile) // Nouveau fichier

    if (!shouldProcess) {
      console.log(`ℹ️ Pas de traitement nécessaire pour ${doc.id}`)
      return doc
    }

    // Vérifier qu'on a bien un fichier source
    if (!doc.sourceFile) {
      console.log(`⚠️ Pas de fichier source pour ${doc.id}`)
      return doc
    }

    // Éviter de retraiter si déjà en cours ou terminé (sauf si explicitement demandé)
    if (['queued', 'extracting', 'enriching', 'updating'].includes(doc.processingStatus)) {
      console.log(`ℹ️ Document ${doc.id} déjà en cours de traitement (${doc.processingStatus})`)
      return doc
    }

    // Récupérer les infos du fichier media
    let mediaDoc
    try {
      // Extraire l'ID du fichier media (peut être un objet ou un string)
      const mediaId = typeof doc.sourceFile === 'object' && doc.sourceFile !== null ? doc.sourceFile.id : doc.sourceFile
      
      mediaDoc = await req.payload.findByID({
        collection: 'media',
        id: mediaId,
        depth: 0,
      })
    } catch (error) {
      console.error(`❌ Impossible de récupérer le fichier media ${doc.sourceFile}:`, error)
      return doc
    }

    if (!mediaDoc) {
      console.error(`❌ Fichier media non trouvé: ${doc.sourceFile}`)
      return doc
    }

    // Déterminer le type de document
    const documentType = getDocumentTypeFromFile(mediaDoc.filename || mediaDoc.name || '')
    
    if (!['pdf', 'epub', 'docx', 'txt'].includes(documentType)) {
      console.log(`⚠️ Type de fichier non supporté: ${documentType}`)
      return doc
    }

    console.log(`📄 Traitement automatique lancé pour: ${mediaDoc.filename} (${documentType})`)

    // Mettre à jour le statut en "queued"
    await req.payload.update({
      collection: 'knowledge-base',
      id: doc.id,
      data: {
        processingStatus: 'queued',
        documentType,
        processingLogs: JSON.stringify({
          autoQueuedAt: new Date().toISOString(),
          trigger: 'admin_interface',
          operation,
          fileName: mediaDoc.filename,
          fileSize: mediaDoc.filesize,
          message: 'Document mis en file d\'attente automatiquement via l\'admin'
        }, null, 2),
      }
    })

    // Construire le vrai path filesystem du fichier
    const filename = mediaDoc.filename || mediaDoc.name || 'unknown'
    const mediaDir = process.env.NODE_ENV === 'production' 
      ? '/app/public/media' // Path en production
      : `${process.cwd()}/public/media` // Path en développement
    const fullFilePath = `${mediaDir}/${filename}`
    
    console.log(`📁 Path du fichier: ${fullFilePath}`)
    
    // Ajouter le job à la file d'attente Bull avec le vrai path
    const mediaId = typeof doc.sourceFile === 'object' && doc.sourceFile !== null ? doc.sourceFile.id : doc.sourceFile
    
    await addExtractionJob({
      type: 'document-extraction',
      documentId: doc.id,
      fileType: documentType,
      sourceFileId: mediaId,
      sourceFileUrl: fullFilePath, // 🔧 UTILISER LE VRAI PATH
      userId: req.user?.id || 'admin',
      priority: 'high',
      collectionType: 'knowledge-base', // 🎯 Spécifier explicitement
    })

    console.log(`✅ Document ${doc.id} ajouté à la file d'attente de traitement`)

    // Retourner le document avec le nouveau statut
    return {
      ...doc,
      processingStatus: 'queued',
      documentType,
    }

  } catch (error) {
    console.error(`❌ Erreur dans hook processDocumentAfterChange pour ${doc.id}:`, error)
    
    // En cas d'erreur, marquer comme échoué
    try {
      await req.payload.update({
        collection: 'knowledge-base',
        id: doc.id,
        data: {
          processingStatus: 'failed',
          processingLogs: JSON.stringify({
            error: error instanceof Error ? error.message : 'Erreur inconnue',
            failedAt: new Date().toISOString(),
            context: 'hook_after_change',
          }, null, 2),
        }
      })
    } catch (updateError) {
      console.error('Erreur mise à jour statut échec:', updateError)
    }

    // Ne pas empêcher la sauvegarde du document
    return doc
  }
}

/**
 * Détermine le type de document à partir du nom de fichier
 */
function getDocumentTypeFromFile(filename: string): string {
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
 * Hook pour valider les données avant sauvegarde
 */
export const validateDocumentBeforeChange: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  // Si c'est une création et qu'il n'y a pas de titre, le générer à partir du fichier
  if (operation === 'create' && !data.title && data.sourceFile) {
    try {
      // Extraire l'ID du fichier media (peut être un objet ou un string)
      const mediaId = typeof data.sourceFile === 'object' && data.sourceFile !== null ? data.sourceFile.id : data.sourceFile
      
      const mediaDoc = await req.payload.findByID({
        collection: 'media',
        id: mediaId,
        depth: 0,
      })

      if (mediaDoc?.filename) {
        data.title = mediaDoc.filename.replace(/\.[^/.]+$/, '') // Enlever l'extension
      }
    } catch (error) {
      console.error('Erreur génération titre automatique:', error)
    }
  }

  return data
}
