/**
 * Script pour forcer le traitement d'un job
 */

import { extractionQueue } from './src/jobs/queue'
import { processExtractionJob } from './src/jobs/workers/extractionWorker'

async function forceProcessJob() {
  console.log('🔧 Forçage du traitement du job...')
  
  try {
    // Récupérer le premier job en attente
    const waitingJobs = await extractionQueue.getWaiting()
    
    if (waitingJobs.length === 0) {
      console.log('❌ Aucun job en attente')
      return
    }
    
    const job = waitingJobs[0]
    console.log(`🎯 Traitement forcé du job ${job.id}:`, job.data)
    
    // Traiter le job directement
    const result = await processExtractionJob(job)
    
    console.log('✅ Job traité avec succès:', result)
    
  } catch (error) {
    console.error('❌ Erreur lors du traitement forcé:', error)
  }
  
  process.exit(0)
}

forceProcessJob()
