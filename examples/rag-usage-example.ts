/**
 * Exemples d'utilisation du système RAG
 */

import { addRAGJob } from '../src/jobs/queue'
import { 
  searchInDocument, 
  deleteDocumentRAG, 
  getDocumentRAGStats 
} from '../src/jobs/workers/ragWorker'
import { vectorStoreService } from '../src/jobs/services/vectorStoreService'

// ===== EXEMPLE 1 : Traiter un document avec RAG =====

async function example1_ProcessDocument() {
  console.log('\n📚 EXEMPLE 1 : Traiter un document avec RAG\n')

  const documentId = 'doc_medical_001'
  const extractedText = `
    Chapitre 1: Introduction à la Cardiologie
    
    La cardiologie est la branche de la médecine qui étudie le cœur et les vaisseaux sanguins.
    Le système cardiovasculaire est composé du cœur, des artères, des veines et des capillaires.
    
    Les principales maladies cardiovasculaires incluent:
    - L'infarctus du myocarde
    - L'insuffisance cardiaque
    - L'hypertension artérielle
    - Les arythmies cardiaques
    
    Chapitre 2: Anatomie du Cœur
    
    Le cœur est un muscle creux divisé en quatre cavités:
    - Oreillette droite
    - Ventricule droit
    - Oreillette gauche
    - Ventricule gauche
  `

  try {
    // Ajouter un job RAG à la queue
    const job = await addRAGJob({
      type: 'rag-processing',
      documentId,
      extractedText,
      priority: 'normal',
      userId: 'user_123',
      chunkingOptions: {
        strategy: 'standard',
        chunkSize: 500,
        chunkOverlap: 100,
      },
      embeddingOptions: {
        provider: 'local', // Utiliser 'openai' en production
      },
    })

    console.log(`✅ Job RAG créé: ${job.id}`)
    console.log(`📊 Status: En attente de traitement`)
    console.log(`\n💡 Le worker va maintenant:`)
    console.log(`   1. Découper le texte en chunks`)
    console.log(`   2. Générer les embeddings`)
    console.log(`   3. Stocker dans ChromaDB`)
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXEMPLE 2 : Rechercher dans un document =====

async function example2_SearchInDocument() {
  console.log('\n🔍 EXEMPLE 2 : Rechercher dans un document\n')

  const documentId = 'doc_medical_001'
  const query = 'Quelles sont les maladies cardiovasculaires ?'

  try {
    const results = await searchInDocument(documentId, query, {
      topK: 3,
      minScore: 0.5,
      embeddingProvider: 'local',
    })

    if (results.success) {
      console.log(`✅ Recherche réussie: ${results.results.length} résultats trouvés\n`)

      results.results.forEach((result, index) => {
        console.log(`\n📄 Résultat ${index + 1}:`)
        console.log(`   Score: ${(result.score * 100).toFixed(1)}%`)
        console.log(`   Chunk: #${result.chunkIndex}`)
        console.log(`   Contenu: ${result.content.substring(0, 200)}...`)
      })
    } else {
      console.error(`❌ Erreur de recherche:`, results.error)
    }
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXEMPLE 3 : Obtenir les statistiques =====

async function example3_GetStats() {
  console.log('\n📊 EXEMPLE 3 : Obtenir les statistiques\n')

  const documentId = 'doc_medical_001'

  try {
    const stats = await getDocumentRAGStats(documentId)

    if (stats.success && stats.stats) {
      console.log(`✅ Statistiques du document:`)
      console.log(`   Collection: ${stats.stats.collectionName}`)
      console.log(`   Nombre de chunks: ${stats.stats.chunksCount}`)
      console.log(`   Existe: ${stats.stats.exists ? 'Oui' : 'Non'}`)
    } else {
      console.error(`❌ Erreur:`, stats.error)
    }
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXEMPLE 4 : Recherche globale multi-documents =====

async function example4_GlobalSearch() {
  console.log('\n🌐 EXEMPLE 4 : Recherche globale multi-documents\n')

  const query = 'anatomie du cœur'

  try {
    // Générer l'embedding de la requête
    const { embeddingService } = await import('../src/jobs/services/embeddingService')
    const queryEmbedding = await embeddingService.generateQueryEmbedding(query, {
      provider: 'local',
    })

    // Rechercher dans toutes les collections
    const results = await vectorStoreService.searchGlobal(queryEmbedding, {
      topK: 3,
      minScore: 0.5,
    })

    console.log(`✅ Recherche globale réussie`)
    console.log(`📚 Collections trouvées: ${results.size}\n`)

    for (const [collectionName, searchResults] of results.entries()) {
      console.log(`\n📁 Collection: ${collectionName}`)
      console.log(`   Résultats: ${searchResults.length}`)

      searchResults.forEach((result, index) => {
        console.log(`\n   📄 Résultat ${index + 1}:`)
        console.log(`      Score: ${(result.score * 100).toFixed(1)}%`)
        console.log(`      Contenu: ${result.chunk.content.substring(0, 100)}...`)
      })
    }
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXEMPLE 5 : Supprimer les données RAG =====

async function example5_DeleteRAG() {
  console.log('\n🗑️ EXEMPLE 5 : Supprimer les données RAG\n')

  const documentId = 'doc_medical_001'

  try {
    const result = await deleteDocumentRAG(documentId)

    if (result.success) {
      console.log(`✅ Données RAG supprimées pour: ${documentId}`)
    } else {
      console.error(`❌ Erreur:`, result.error)
    }
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXEMPLE 6 : Vérifier la santé de ChromaDB =====

async function example6_HealthCheck() {
  console.log('\n🏥 EXEMPLE 6 : Vérifier la santé de ChromaDB\n')

  try {
    const isHealthy = await vectorStoreService.healthCheck()

    if (isHealthy) {
      console.log(`✅ ChromaDB est opérationnel`)

      // Lister les collections
      const collections = await vectorStoreService.listCollections()
      console.log(`📚 Collections disponibles: ${collections.length}`)
      collections.forEach(name => console.log(`   - ${name}`))
    } else {
      console.error(`❌ ChromaDB n'est pas accessible`)
      console.log(`💡 Vérifiez que ChromaDB est démarré:`)
      console.log(`   docker run -d -p 8000:8000 chromadb/chroma`)
    }
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXEMPLE 7 : Pipeline complet =====

async function example7_FullPipeline() {
  console.log('\n🚀 EXEMPLE 7 : Pipeline RAG complet\n')

  const documentId = 'doc_test_' + Date.now()
  const extractedText = `
    Le diabète est une maladie chronique caractérisée par un taux élevé de glucose dans le sang.
    Il existe deux types principaux de diabète: le type 1 et le type 2.
    
    Le diabète de type 1 est une maladie auto-immune où le pancréas ne produit pas d'insuline.
    Le diabète de type 2 est caractérisé par une résistance à l'insuline.
    
    Les symptômes incluent: soif excessive, fatigue, vision floue, et cicatrisation lente.
    Le traitement peut inclure des modifications du mode de vie, des médicaments oraux, ou de l'insuline.
  `

  try {
    console.log(`📝 Étape 1: Création du job RAG`)
    const job = await addRAGJob({
      type: 'rag-processing',
      documentId,
      extractedText,
      priority: 'high',
      userId: 'user_demo',
      chunkingOptions: {
        strategy: 'standard',
        chunkSize: 300,
        chunkOverlap: 50,
      },
      embeddingOptions: {
        provider: 'local',
      },
    })
    console.log(`✅ Job créé: ${job.id}`)

    // Attendre que le job soit traité (simulation)
    console.log(`\n⏳ Attente du traitement (5 secondes)...`)
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log(`\n🔍 Étape 2: Recherche dans le document`)
    const searchResults = await searchInDocument(
      documentId,
      'Quels sont les symptômes du diabète ?',
      { topK: 2, minScore: 0.3 }
    )

    if (searchResults.success) {
      console.log(`✅ ${searchResults.results.length} résultats trouvés`)
      searchResults.results.forEach((r, i) => {
        console.log(`\n   ${i + 1}. Score: ${(r.score * 100).toFixed(1)}%`)
        console.log(`      ${r.content.substring(0, 150)}...`)
      })
    }

    console.log(`\n📊 Étape 3: Statistiques`)
    const stats = await getDocumentRAGStats(documentId)
    if (stats.success && stats.stats) {
      console.log(`✅ Chunks stockés: ${stats.stats.chunksCount}`)
    }

    console.log(`\n🗑️ Étape 4: Nettoyage`)
    await deleteDocumentRAG(documentId)
    console.log(`✅ Données supprimées`)

    console.log(`\n🎉 Pipeline complet terminé avec succès!`)
  } catch (error) {
    console.error(`❌ Erreur:`, error)
  }
}

// ===== EXÉCUTION =====

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     EXEMPLES D\'UTILISATION DU SYSTÈME RAG             ║')
  console.log('╚════════════════════════════════════════════════════════╝')

  // Décommenter l'exemple que vous voulez tester

  // await example1_ProcessDocument()
  // await example2_SearchInDocument()
  // await example3_GetStats()
  // await example4_GlobalSearch()
  // await example5_DeleteRAG()
  await example6_HealthCheck()
  // await example7_FullPipeline()

  console.log('\n✅ Exemples terminés\n')
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error)
}

export {
  example1_ProcessDocument,
  example2_SearchInDocument,
  example3_GetStats,
  example4_GlobalSearch,
  example5_DeleteRAG,
  example6_HealthCheck,
  example7_FullPipeline,
}
