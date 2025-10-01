/**
 * Mock pour les queues Bull utilisé dans les tests
 */

// Mock de Redis
export const redis = {
  disconnect: () => Promise.resolve(),
  on: () => {},
  off: () => {},
  connect: () => Promise.resolve(),
}

// Mock d'une queue Bull
const createMockQueue = (name: string) => ({
  name,
  add: () => Promise.resolve({ id: 'mock-job-id' }),
  process: () => {},
  on: () => {},
  off: () => {},
  getWaiting: () => Promise.resolve([]),
  getActive: () => Promise.resolve([]),
  getCompleted: () => Promise.resolve([]),
  getFailed: () => Promise.resolve([]),
  getDelayed: () => Promise.resolve([]),
  isPaused: () => Promise.resolve(false),
  pause: () => Promise.resolve(),
  resume: () => Promise.resolve(),
  close: () => Promise.resolve(),
  clean: () => Promise.resolve([]),
})

// Mock des queues
export const extractionQueue = createMockQueue('document-extraction')
export const nlpQueue = createMockQueue('nlp-processing')
export const aiQueue = createMockQueue('ai-enrichment')
export const validationQueue = createMockQueue('validation-check')

export const allQueues = [
  extractionQueue,
  nlpQueue,
  aiQueue,
  validationQueue,
]

// Mock des fonctions utilitaires
export const getQueueStats = () => Promise.resolve({
  name: 'mock-queue',
  waiting: 0,
  active: 0,
  completed: 0,
  failed: 0,
  delayed: 0,
  isPaused: false,
})

export const getAllQueueStats = () => Promise.resolve([])

export const cleanAllQueues = () => Promise.resolve()

export const pauseAllQueues = () => Promise.resolve()

export const resumeAllQueues = () => Promise.resolve()

export const closeAllQueues = () => Promise.resolve()

// Mock des fonctions d'ajout de jobs
export const addExtractionJob = () => Promise.resolve({ id: 'mock-extraction-job' })

export const addNLPJob = () => Promise.resolve({ id: 'mock-nlp-job' })

export const addAIJob = () => Promise.resolve({ id: 'mock-ai-job' })

export const addValidationJob = () => Promise.resolve({ id: 'mock-validation-job' })

export const initQueueLifecycle = () => {}
