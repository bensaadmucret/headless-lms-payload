import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Bull queues pour éviter les dépendances Redis
vi.mock('bull', () => {
  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    getWaiting: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
    isPaused: vi.fn().mockResolvedValue(false),
    clean: vi.fn().mockResolvedValue(0),
    pause: vi.fn().mockResolvedValue(),
    resume: vi.fn().mockResolvedValue(),
    close: vi.fn().mockResolvedValue(),
    on: vi.fn(),
    name: 'test-queue'
  }
  
  return {
    default: vi.fn(() => mockQueue)
  }
})

// Mock IORedis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    disconnect: vi.fn().mockResolvedValue()
  }))
}))

describe('Queue System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Queue Configuration', () => {
    it('should create queues with correct configuration', async () => {
      const { extractionQueue } = await import('../queue')
      
      expect(extractionQueue).toBeDefined()
      expect(extractionQueue.name).toBe('test-queue')
    })
  })

  describe('Job Management', () => {
    it('should add extraction job correctly', async () => {
      const { addExtractionJob } = await import('../queue')
      
      const jobData = {
        type: 'document-extraction' as const,
        documentId: 'doc-123',
        fileType: 'pdf' as const,
        sourceFileId: 'file-123',
        sourceFileUrl: '/path/to/file.pdf',
        userId: 'user-123',
        priority: 'high' as const
      }
      
      const job = await addExtractionJob(jobData)
      
      expect(job).toBeDefined()
      expect(job.id).toBe('job-123')
    })

    it('should add NLP job correctly', async () => {
      const { addNLPJob } = await import('../queue')
      
      const jobData = {
        type: 'nlp-processing' as const,
        documentId: 'doc-123',
        fileType: 'pdf' as const,
        sourceFileId: 'file-123',
        sourceFileUrl: '/path/to/file.pdf',
        userId: 'user-123',
        priority: 'normal' as const
      }
      
      const job = await addNLPJob(jobData)
      
      expect(job).toBeDefined()
      expect(job.id).toBe('job-123')
    })

    it('should add AI job correctly', async () => {
      const { addAIJob } = await import('../queue')
      
      const jobData = {
        type: 'ai-enrichment' as const,
        documentId: 'doc-123',
        fileType: 'pdf' as const,
        sourceFileId: 'file-123',
        sourceFileUrl: '/path/to/file.pdf',
        userId: 'user-123',
        priority: 'normal' as const
      }
      
      const job = await addAIJob(jobData)
      
      expect(job).toBeDefined()
      expect(job.id).toBe('job-123')
    })

    it('should add validation job correctly', async () => {
      const { addValidationJob } = await import('../queue')
      
      const jobData = {
        type: 'validation-check' as const,
        documentId: 'doc-123',
        fileType: 'pdf' as const,
        sourceFileId: 'file-123',
        sourceFileUrl: '/path/to/file.pdf',
        userId: 'user-123',
        priority: 'low' as const
      }
      
      const job = await addValidationJob(jobData)
      
      expect(job).toBeDefined()
      expect(job.id).toBe('job-123')
    })
  })

  describe('Queue Statistics', () => {
    it('should get queue stats correctly', async () => {
      const { getQueueStats, extractionQueue } = await import('../queue')
      
      const stats = await getQueueStats(extractionQueue)
      
      expect(stats).toEqual({
        name: 'test-queue',
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        isPaused: false
      })
    })

    it('should get all queue stats', async () => {
      const { getAllQueueStats } = await import('../queue')
      
      const allStats = await getAllQueueStats()
      
      expect(Array.isArray(allStats)).toBe(true)
      expect(allStats.length).toBeGreaterThan(0)
    })
  })

  describe('Priority System', () => {
    it('should convert priority strings to numbers correctly', async () => {
      // Cette fonction est interne, nous testons son comportement via addExtractionJob
      const { addExtractionJob } = await import('../queue')
      const Bull = await import('bull')
      
      const jobData = {
        type: 'document-extraction' as const,
        documentId: 'doc-123',
        fileType: 'pdf' as const,
        sourceFileId: 'file-123',
        sourceFileUrl: '/path/to/file.pdf',
        userId: 'user-123',
        priority: 'critical' as const
      }
      
      await addExtractionJob(jobData)
      
      // Vérifier que add a été appelé avec la bonne priorité
      const mockQueue = (Bull.default as any).mock.results[0].value
      expect(mockQueue.add).toHaveBeenCalledWith(
        'extract-document',
        jobData,
        expect.objectContaining({
          priority: 20, // critical = 20
          delay: 0
        })
      )
    })
  })

  describe('Queue Management', () => {
    it('should clean all queues', async () => {
      const { cleanAllQueues } = await import('../queue')
      
      await expect(cleanAllQueues()).resolves.toBeUndefined()
    })

    it('should pause all queues', async () => {
      const { pauseAllQueues } = await import('../queue')
      
      await expect(pauseAllQueues()).resolves.toBeUndefined()
    })

    it('should resume all queues', async () => {
      const { resumeAllQueues } = await import('../queue')
      
      await expect(resumeAllQueues()).resolves.toBeUndefined()
    })

    it('should close all queues', async () => {
      const { closeAllQueues } = await import('../queue')
      
      await expect(closeAllQueues()).resolves.toBeUndefined()
    })
  })
})