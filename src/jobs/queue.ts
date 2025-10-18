/**
 * Configuration et initialisation des queues Bull
 */

import Queue from 'bull'
import type { Queue as BullQueue } from 'bull'
import IORedis from 'ioredis'
import type { JobData, JobOptions } from './types'

// Configuration Redis simplifiée (fix pour Bull 4.x)
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

// Création du client Redis
export const redis = new IORedis(redisUrl)

// Options par défaut pour tous les jobs
const defaultJobOptions: JobOptions = {
  attempts: 3,
  removeOnComplete: 100,
  removeOnFail: 50,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  timeout: 5 * 60 * 1000, // 5 minutes
}

// ===== QUEUES DÉFINIES =====

/**
 * Queue principale pour l'extraction de documents
 */
export const extractionQueue = new Queue('document-extraction', redisUrl, {
  defaultJobOptions: {
    ...defaultJobOptions,
    timeout: 30 * 60 * 1000, // 30 minutes pour l'extraction (gros PDFs)
  },
  settings: {
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
  },
})

/**
 * Queue pour l'analyse NLP
 */
export const nlpQueue = new Queue('nlp-processing', redisUrl, {
  defaultJobOptions: {
    ...defaultJobOptions,
    timeout: 3 * 60 * 1000, // 3 minutes pour le NLP
  },
  settings: {
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
  },
})

/**
 * Queue pour l'enrichissement IA
 */
export const aiQueue = new Queue('ai-enrichment', redisUrl, {
  defaultJobOptions: {
    ...defaultJobOptions,
    timeout: 8 * 60 * 1000, // 8 minutes pour l'IA (APIs externes)
    attempts: 2, // Moins de tentatives pour l'IA (coûteuse)
  },
  settings: {
    stalledInterval: 60 * 1000,
    maxStalledCount: 1,
  },
})

/**
 * Queue pour la validation
 */
export const validationQueue = new Queue('validation-check', redisUrl, {
  defaultJobOptions: {
    ...defaultJobOptions,
    timeout: 2 * 60 * 1000, // 2 minutes pour la validation
  },
  settings: {
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
  },
})

/**
 * Queue pour le traitement RAG (Chunking + Embeddings + Vector Store)
 */
export const ragQueue = new Queue('rag-processing', redisUrl, {
  defaultJobOptions: {
    ...defaultJobOptions,
    timeout: 15 * 60 * 1000, // 15 minutes pour le RAG (embeddings peuvent être longs)
  },
  settings: {
    stalledInterval: 60 * 1000,
    maxStalledCount: 1,
  },
})

/**
 * Queue pour l'import de fichiers JSON/CSV
 */
export const importQueue = new Queue('json-csv-import', redisUrl, {
  defaultJobOptions: {
    ...defaultJobOptions,
    timeout: 20 * 60 * 1000, // 20 minutes pour les gros imports
  },
  settings: {
    stalledInterval: 60 * 1000,
    maxStalledCount: 2, // Retry 2 fois si le worker plante
  },
})

// Array de toutes les queues pour faciliter la gestion
export const allQueues = [
  extractionQueue,
  nlpQueue,
  aiQueue,
  validationQueue,
  ragQueue,
  importQueue,
]

// ===== UTILITAIRES =====

/**
 * Obtenir les statistiques d'une queue
 */
export async function getQueueStats(queue: BullQueue) {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed(),
    queue.getDelayed(),
    queue.isPaused(),
  ])

  return {
    name: queue.name,
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
    delayed: delayed.length,
    isPaused: paused,
  }
}

/**
 * Obtenir les stats de toutes les queues
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    allQueues.map(queue => getQueueStats(queue))
  )
  return stats
}

/**
 * Nettoyer les jobs terminés de toutes les queues
 */
export async function cleanAllQueues() {
  const cleanPromises = allQueues.map(queue => 
    queue.clean(24 * 60 * 60 * 1000, 'completed') // 24h
  )
  await Promise.all(cleanPromises)
}

/**
 * Pauser toutes les queues
 */
export async function pauseAllQueues() {
  const pausePromises = allQueues.map(queue => queue.pause())
  await Promise.all(pausePromises)
}

/**
 * Reprendre toutes les queues
 */
export async function resumeAllQueues() {
  const resumePromises = allQueues.map(queue => queue.resume())
  await Promise.all(resumePromises)
}

/**
 * Fermer proprement toutes les queues
 */
export async function closeAllQueues() {
  const closePromises = allQueues.map(queue => queue.close())
  await Promise.all(closePromises)
  await redis.disconnect()
}

// ===== HELPERS POUR AJOUTER DES JOBS =====

/**
 * Ajouter un job d'extraction
 */
export async function addExtractionJob(data: Extract<JobData, { type: 'document-extraction' }>) {
  const priority = getPriorityValue(data.priority)
  
  return extractionQueue.add('extract-document', data, {
    priority,
    delay: 0,
  })
}

/**
 * Ajouter un job NLP
 */
export async function addNLPJob(data: Extract<JobData, { type: 'nlp-processing' }>) {
  const priority = getPriorityValue(data.priority)
  
  return nlpQueue.add('process-nlp', data, {
    priority,
    delay: 1000, // Petit délai pour s'assurer que l'extraction soit terminée
  })
}

/**
 * Ajouter un job IA
 */
export async function addAIJob(data: Extract<JobData, { type: 'ai-enrichment' }>) {
  const priority = getPriorityValue(data.priority)
  
  return aiQueue.add('ai-enrichment', data, {
    priority,
    delay: 2000, // Délai pour s'assurer que le NLP soit terminé
  })
}

/**
 * Ajouter un job de validation
 */
export async function addValidationJob(data: Extract<JobData, { type: 'validation-check' }>) {
  const priority = getPriorityValue(data.priority)
  
  return validationQueue.add('validate-document', data, {
    priority,
    delay: 3000, // Délai final pour la validation
  })
}

/**
 * Ajouter un job RAG
 */
export async function addRAGJob(data: Extract<JobData, { type: 'rag-processing' }>) {
  const priority = getPriorityValue(data.priority)
  
  return ragQueue.add('process-rag', data, {
    priority,
    delay: 1500, // Délai après l'extraction
  })
}

/**
 * Convertir la priorité en valeur numérique pour Bull
 */
function getPriorityValue(priority: JobData['priority']): number {
  const priorities = {
    'low': 1,
    'normal': 5,
    'high': 10,
    'critical': 20,
  }
  return priorities[priority]
}

// ===== EVENT HANDLERS GLOBAUX =====

// Logging des événements importants
allQueues.forEach(queue => {
  queue.on('completed', (job) => {
    console.log(`✅ [${queue.name}] Job ${job.id} completed`)
  })
  
  queue.on('failed', (job, err) => {
    console.error(`❌ [${queue.name}] Job ${job?.id} failed:`, err.message)
  })
  
  queue.on('stalled', (job) => {
    console.warn(`⚠️ [${queue.name}] Job ${job.id} stalled`)
  })
  
  queue.on('error', (err) => {
    console.error(`💥 [${queue.name}] Queue error:`, err)
  })
})

let lifecycleInitialized = false

export function initQueueLifecycle() {
  if (lifecycleInitialized) return
  lifecycleInitialized = true

  // Nettoyage automatique périodique (toutes les heures)
  setInterval(async () => {
    try {
      await cleanAllQueues()
      console.log('🧹 Automatic queue cleanup completed')
    } catch (error) {
      console.error('🧹 Queue cleanup failed:', error)
    }
  }, 60 * 60 * 1000)

  // Gestion propre de l'arrêt
  process.on('SIGTERM', async () => {
    console.log('🔄 Closing queues gracefully...')
    await closeAllQueues()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    console.log('🔄 Closing queues gracefully...')
    await closeAllQueues()
    process.exit(0)
  })
}
