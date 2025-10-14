/**
 * Script de debug pour tester l'AIWorker
 * Usage: tsx src/jobs/debug-ai-worker.ts <documentId>
 */

import { getPayloadInstance } from './initPayload'

interface DocumentWithContent {
  id: string
  extractedContent?: string
  processingStatus?: string
  [key: string]: unknown
}

async function debugDocument(documentId: string) {
  console.log(`\n🔍 Debugging document: ${documentId}\n`)
  
  try {
    const payload = await getPayloadInstance()
    
    // Essayer knowledge-base
    console.log('📚 Checking knowledge-base collection...')
    try {
      const kbDoc = await payload.findByID({
        collection: 'knowledge-base',
        id: documentId,
        depth: 0
      })
      
      console.log('✅ Document found in knowledge-base')
      console.log('📋 Available fields:', Object.keys(kbDoc).join(', '))
      
      const doc = kbDoc as unknown as DocumentWithContent
      
      if (doc.extractedContent) {
        console.log(`✅ extractedContent: ${doc.extractedContent.length} characters`)
        console.log(`📝 First 200 chars: ${doc.extractedContent.slice(0, 200)}...`)
      } else {
        console.log('❌ extractedContent: MISSING or EMPTY')
      }
      
      if (doc.processingStatus) {
        console.log(`📊 processingStatus: ${doc.processingStatus}`)
      }
      
      return
    } catch (kbError) {
      console.log('ℹ️ Document not found in knowledge-base')
    }
    
    // Essayer media
    console.log('\n📁 Checking media collection...')
    try {
      const mediaDoc = await payload.findByID({
        collection: 'media',
        id: documentId,
        depth: 0
      })
      
      console.log('✅ Document found in media')
      console.log('📋 Available fields:', Object.keys(mediaDoc).join(', '))
      
      const doc = mediaDoc as unknown as DocumentWithContent
      
      if (doc.extractedContent) {
        console.log(`✅ extractedContent: ${doc.extractedContent.length} characters`)
        console.log(`📝 First 200 chars: ${doc.extractedContent.slice(0, 200)}...`)
      } else {
        console.log('❌ extractedContent: MISSING or EMPTY')
      }
      
      return
    } catch (mediaError) {
      console.log('ℹ️ Document not found in media')
    }
    
    console.log('\n❌ Document not found in any collection!')
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error)
  }
  
  process.exit(0)
}

// Récupérer l'ID du document depuis les arguments
const documentId = process.argv[2]

if (!documentId) {
  console.error('❌ Usage: tsx src/jobs/debug-ai-worker.ts <documentId>')
  process.exit(1)
}

debugDocument(documentId)
