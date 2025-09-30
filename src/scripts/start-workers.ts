#!/usr/bin/env node

/**
 * Script de démarrage des workers pour le traitement asynchrone des documents
 * 
 * Usage:
 *   npx tsx src/scripts/start-workers.ts
 *   ou
 *   npm run workers
 */

import 'dotenv/config'
import { startExtractionWorker } from '../jobs/workers/extractionWorker'
import { getAllQueueStats, closeAllQueues, initQueueLifecycle } from '../jobs/queue'

async function main() {
  console.log('🚀 Démarrage des workers de traitement de documents...')
  console.log(`📋 Configuration Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`)
  
  initQueueLifecycle()

  try {
    // Démarrer le worker d'extraction
    console.log('🔧 Démarrage du worker d\'extraction...')
    startExtractionWorker()
    
    console.log('\n✅ Workers démarrés et prêts à traiter les jobs!')
    console.log('\n📊 Workers en cours d\'exécution:')
    console.log('   🔍 ExtractionWorker (3 concurrency)') 
    
    console.log('\n📋 Files d\'attente actives:')
    console.log('   • document-extraction')
    console.log('   • nlp-processing')
    console.log('   • ai-enrichment')
    console.log('   • validation-check')
    
    console.log('\n💡 Les workers traiteront automatiquement les documents uploadés')
    console.log('🛑 Pour arrêter: Ctrl+C')
    
    // Affichage périodique des statistiques
    const statsInterval = setInterval(async () => {
      try {
        const { getAllQueueStats } = await import('../jobs/queue')
        const stats = await getAllQueueStats()
        
        const totalWaiting = stats.reduce((sum, q) => sum + q.waiting, 0)
        const totalActive = stats.reduce((sum, q) => sum + q.active, 0)
        const totalCompleted = stats.reduce((sum, q) => sum + q.completed, 0)
        
        if (totalWaiting > 0 || totalActive > 0) {
          console.log(`\n📈 Stats queues: ${totalWaiting} en attente, ${totalActive} en traitement, ${totalCompleted} terminés`)
        }
      } catch (error) {
        // Silently ignore stats errors
      }
    }, 30000) // Toutes les 30 secondes
    
    // Nettoyage périodique des anciens jobs
    const cleanupInterval = setInterval(async () => {
      try {
        const { cleanAllQueues } = await import('../jobs/queue')
        await cleanAllQueues()
        console.log('🧹 Nettoyage périodique des queues terminé')
      } catch (error) {
        console.error('Erreur nettoyage périodique:', error)
      }
    }, 60 * 60 * 1000) // Toutes les heures
    
    // Gestion propre de l'arrêt
    process.on('SIGINT', async () => {
      console.log('\n🛑 Arrêt des workers...')
      clearInterval(statsInterval)
      clearInterval(cleanupInterval)
      
      try {
        await closeAllQueues()
        process.exit(0)
      } catch (error) {
        console.error('Erreur arrêt:', error)
        process.exit(1)
      }
    })
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage des workers:', error)
    process.exit(1)
  }
}

// Démarrer le script
main().catch((error) => {
  console.error('❌ Erreur fatale:', error)
  process.exit(1)
})
