/**
 * Forcer le retraitement d'un document existant
 */

import { getPayload } from 'payload'
import { addExtractionJob } from './src/jobs/queue'
import config from './src/payload.config'

async function forceReprocess() {
  console.log('🔄 Forçage du retraitement des documents...\n')
  
  try {
    const payload = await getPayload({ config })
    
    // Récupérer le document ID 9 (le plus récent)
    const doc = await payload.findByID({
      collection: 'knowledge-base',
      id: '9',
      depth: 1
    })
    
    if (!doc) {
      console.log('❌ Document ID 9 non trouvé')
      return
    }
    
    console.log(`📄 Document trouvé: ${doc.title}`)
    console.log(`   Status actuel: ${doc.processingStatus}`)
    console.log(`   Fichier: ${doc.sourceFile?.filename || 'N/A'}`)
    
    // Récupérer les infos du fichier media
    const mediaDoc = await payload.findByID({
      collection: 'media',
      id: doc.sourceFile.id || doc.sourceFile,
      depth: 0
    })
    
    console.log(`📁 Fichier media: ${mediaDoc.filename}`)
    console.log(`   Taille: ${mediaDoc.filesize} bytes`)
    console.log(`   URL: ${mediaDoc.url}`)
    
    // Mettre à jour le statut
    await payload.update({
      collection: 'knowledge-base',
      id: doc.id,
      data: {
        processingStatus: 'queued',
        processingLogs: JSON.stringify({
          forcedReprocessAt: new Date().toISOString(),
          trigger: 'manual_script',
          message: 'Retraitement forcé via script'
        }, null, 2)
      }
    })
    
    // Créer un nouveau job
    const job = await addExtractionJob({
      type: 'document-extraction',
      documentId: doc.id,
      fileType: 'pdf',
      sourceFileId: mediaDoc.id,
      sourceFileUrl: mediaDoc.url,
      userId: 'admin',
      priority: 'high'
    })
    
    console.log(`✅ Job créé avec ID: ${job.id}`)
    console.log('⏳ Le worker devrait traiter ce job automatiquement...')
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
  
  process.exit(0)
}

forceReprocess()
