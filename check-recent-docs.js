/**
 * Vérifier les documents récents dans la base
 */

import { getPayload } from 'payload'
import config from './src/payload.config'

async function checkRecentDocs() {
  console.log('🔍 Vérification des documents récents...\n')
  
  try {
    const payload = await getPayload({ config })
    
    // Récupérer les documents récents (dernières 24h)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    
    const recentDocs = await payload.find({
      collection: 'knowledge-base',
      where: {
        createdAt: {
          greater_than: oneDayAgo.toISOString()
        }
      },
      sort: '-createdAt',
      limit: 10,
      depth: 1
    })
    
    console.log(`📊 ${recentDocs.docs.length} documents trouvés dans les dernières 24h:`)
    
    recentDocs.docs.forEach((doc, index) => {
      console.log(`\n${index + 1}. Document: ${doc.id}`)
      console.log(`   Titre: ${doc.title || 'Sans titre'}`)
      console.log(`   Créé: ${new Date(doc.createdAt).toLocaleString()}`)
      console.log(`   Status: ${doc.processingStatus || 'Non défini'}`)
      console.log(`   Type: ${doc.documentType || 'Non défini'}`)
      console.log(`   Fichier source: ${doc.sourceFile || 'Aucun'}`)
      
      if (doc.sourceFile && typeof doc.sourceFile === 'object') {
        console.log(`   Nom fichier: ${doc.sourceFile.filename || doc.sourceFile.name || 'N/A'}`)
      }
    })
    
    // Vérifier aussi les fichiers media récents
    const recentMedia = await payload.find({
      collection: 'media',
      where: {
        createdAt: {
          greater_than: oneDayAgo.toISOString()
        }
      },
      sort: '-createdAt',
      limit: 5
    })
    
    console.log(`\n📁 ${recentMedia.docs.length} fichiers media récents:`)
    recentMedia.docs.forEach((media, index) => {
      console.log(`\n${index + 1}. Media: ${media.id}`)
      console.log(`   Nom: ${media.filename || media.name}`)
      console.log(`   Taille: ${media.filesize} bytes`)
      console.log(`   Type: ${media.mimeType}`)
      console.log(`   Créé: ${new Date(media.createdAt).toLocaleString()}`)
    })
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
  
  process.exit(0)
}

checkRecentDocs()
