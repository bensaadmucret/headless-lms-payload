/**
 * Script pour nettoyer complètement les queues
 */

import { extractionQueue } from './src/jobs/queue'

async function cleanQueue() {
  console.log('🧹 Nettoyage complet des queues...')
  
  try {
    // Supprimer tous les jobs
    await extractionQueue.empty()
    console.log('✅ Queue vidée')
    
    // Nettoyer les jobs terminés et échoués
    await extractionQueue.clean(0, 'completed')
    await extractionQueue.clean(0, 'failed')
    await extractionQueue.clean(0, 'active')
    await extractionQueue.clean(0, 'waiting')
    console.log('✅ Queue nettoyée')
    
    // Vérifier l'état final
    const stats = {
      waiting: (await extractionQueue.getWaiting()).length,
      active: (await extractionQueue.getActive()).length,
      completed: (await extractionQueue.getCompleted()).length,
      failed: (await extractionQueue.getFailed()).length,
    }
    
    console.log('📊 État final:', stats)
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error)
  }
  
  process.exit(0)
}

cleanQueue()
