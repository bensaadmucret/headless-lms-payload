/**
 * Vérifier s'il y a un document Knowledge Base pour le media ID 17
 */

import { getPayload } from 'payload'
import config from './src/payload.config'

async function checkMedia17() {
  console.log('🔍 Vérification du media ID 17...\n')
  
  try {
    const payload = await getPayload({ config })
    
    // Chercher des documents Knowledge Base qui référencent le media ID 17
    const docs = await payload.find({
      collection: 'knowledge-base',
      where: {
        sourceFile: {
          equals: '17'
        }
      },
      depth: 1
    })
    
    console.log(`📊 ${docs.docs.length} documents trouvés pour le media ID 17:`)
    
    if (docs.docs.length === 0) {
      console.log('❌ Aucun document Knowledge Base ne référence le media ID 17')
      console.log('💡 Solution: Créez un document Knowledge Base et sélectionnez ce fichier PDF')
    } else {
      docs.docs.forEach((doc, index) => {
        console.log(`\n${index + 1}. Document: ${doc.id}`)
        console.log(`   Titre: ${doc.title}`)
        console.log(`   Status: ${doc.processingStatus}`)
        console.log(`   Créé: ${new Date(doc.createdAt).toLocaleString()}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  }
  
  process.exit(0)
}

checkMedia17()
