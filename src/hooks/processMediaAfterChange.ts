import type { CollectionAfterChangeHook } from 'payload'
import { addExtractionJob } from '../jobs/queue'

/**
 * Hook qui se déclenche après l'upload d'un fichier media
 * 
 * Ce hook :
 * 1. Détecte si c'est un PDF
 * 2. Lance automatiquement l'extraction de contenu
 * 3. Met à jour le document media avec le contenu extrait
 */
export const processMediaAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
  previousDoc,
}) => {
  try {
    console.log(`🔥🔥🔥 HOOK MEDIA TRIGGERED! ${operation} - ${doc.id} 🔥🔥🔥`)
    console.log(`🔄 Hook processMediaAfterChange: ${operation} - ${doc.id}`)

    // Ne traiter que les nouveaux uploads (create) ou changements de fichier (update)
    const shouldProcess = 
      operation === 'create' || // Nouvel upload
      (operation === 'update' && doc.filename !== previousDoc?.filename) // Nouveau fichier

    if (!shouldProcess) {
      console.log(`ℹ️ Pas de traitement nécessaire pour le media ${doc.id}`)
      return doc
    }

    // Vérifier qu'on a bien un fichier
    if (!doc.filename) {
      console.log(`⚠️ Pas de nom de fichier pour le media ${doc.id}`)
      return doc
    }

    // Déterminer le type de document
    const documentType = getDocumentTypeFromFile(doc.filename)
    
    // Ne traiter que les PDFs pour l'instant
    if (documentType !== 'pdf') {
      console.log(`ℹ️ Type de fichier non traité automatiquement: ${documentType}`)
      return doc
    }

    // Vérifier qu'on n'a pas déjà du contenu extrait
    if (doc.extractedContent && doc.extractedContent.trim().length > 0) {
      console.log(`ℹ️ Media ${doc.id} a déjà du contenu extrait, skipping`)
      return doc
    }

    console.log(`📄 Extraction automatique lancée pour: ${doc.filename} (${documentType})`)

    // Construire le vrai path filesystem du fichier
    const mediaDir = process.env.NODE_ENV === 'production' 
      ? '/app/public/media' // Path en production
      : `${process.cwd()}/public/media` // Path en développement
    
    // Utiliser le vrai nom de fichier stocké par Payload (peut être différent du nom original)
    const actualFilename = doc.filename || doc.name || 'unknown'
    const fullFilePath = `${mediaDir}/${actualFilename}`
    
    console.log(`📁 Path du fichier: ${fullFilePath}`)
    console.log(`🚀 Création du job (le worker attendra le fichier)...`)
    
    // Ajouter le job à la file d'attente Bull
    await addExtractionJob({
      type: 'document-extraction',
      documentId: doc.id.toString(),
      fileType: documentType as 'pdf' | 'epub' | 'docx' | 'txt',
      sourceFileId: doc.id.toString(),
      sourceFileUrl: fullFilePath,
      userId: req.user?.id?.toString() || 'auto-extraction',
      priority: 'normal',
      collectionType: 'media', // Spécifier que c'est un document media
    })

    console.log(`✅ Media ${doc.id} ajouté à la file d'attente d'extraction`)

    // Créer automatiquement un document Knowledge-base lié
    await createKnowledgeBaseDocument(doc, req)

    return doc

  } catch (error) {
    console.error(`❌ Erreur dans hook processMediaAfterChange pour ${doc.id}:`, error)
    
    // Ne pas empêcher la sauvegarde du document media en cas d'erreur
    return doc
  }
}

/**
 * Créer automatiquement un document Knowledge-base lié au Media
 */
async function createKnowledgeBaseDocument(mediaDoc: any, req: any) {
  try {
    console.log(`📚 Création automatique d'un document Knowledge-base pour ${mediaDoc.filename}`)
    
    const payload = req.payload
    
    // Déterminer le domaine médical et la difficulté à partir du nom de fichier
    const filename = mediaDoc.filename.toLowerCase()
    let medicalDomain = 'autre'
    const difficulty = 'intermediate'
    let title = mediaDoc.filename.replace(/\.[^/.]+$/, '') // Enlever l'extension
    
    // Logique simple de classification
    if (filename.includes('medecine') || filename.includes('referentiel')) {
      medicalDomain = 'medecine_generale'
      title = 'Référentiel Médecine Générale'
    } else if (filename.includes('cardio')) {
      medicalDomain = 'cardiologie'
    } else if (filename.includes('neuro')) {
      medicalDomain = 'neurologie'
    } else if (filename.includes('anatomie')) {
      medicalDomain = 'anatomie'
    }
    
    // Vérifier si un document Knowledge-base existe déjà pour ce fichier media
    const existing = await payload.find({
      collection: 'knowledge-base',
      where: {
        sourceFile: {
          equals: mediaDoc.id
        }
      },
      limit: 1
    })
    
    if (existing.docs.length > 0) {
      console.log(`📚 Document Knowledge-base existe déjà pour ${mediaDoc.filename}`)
      return
    }
    
    // Créer le document Knowledge-base
    const knowledgeDoc = await payload.create({
      collection: 'knowledge-base',
      data: {
        title,
        originalFileName: mediaDoc.filename,
        documentType: getDocumentTypeFromFile(mediaDoc.filename),
        sourceFile: mediaDoc.id,
        medicalDomain,
        difficulty,
        user: req.user?.id,
      },
      user: req.user
    })
    
    console.log(`✅ Document Knowledge-base créé avec ID: ${knowledgeDoc.id}`)
    
    // Ajouter un job d'extraction pour le document Knowledge-base aussi
    await addExtractionJob({
      type: 'document-extraction',
      documentId: knowledgeDoc.id.toString(),
      fileType: getDocumentTypeFromFile(mediaDoc.filename) as 'pdf' | 'epub' | 'docx' | 'txt',
      sourceFileId: mediaDoc.id.toString(),
      sourceFileUrl: `${process.cwd()}/public/media/${mediaDoc.filename}`,
      userId: req.user?.id?.toString() || 'auto-extraction',
      priority: 'normal',
      collectionType: 'knowledge-base', // Important : Knowledge-base cette fois
    })
    
    console.log(`✅ Job d'extraction créé pour Knowledge-base ID: ${knowledgeDoc.id}`)
    
  } catch (error) {
    console.error(`❌ Erreur création Knowledge-base:`, error)
    // Ne pas bloquer le processus principal
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