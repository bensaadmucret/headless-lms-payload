/**
 * Configuration globale pour les tests Vitest
 * 
 * Ce fichier mocke les dépendances problématiques (bull, ioredis)
 * pour éviter les erreurs de résolution de modules en CI
 */

import { vi } from 'vitest'

// Mock de Bull - bibliothèque de gestion de queues
vi.mock('bull', () => {
  const mockQueue = {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
    process: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getWaiting: vi.fn().mockResolvedValue([]),
    getActive: vi.fn().mockResolvedValue([]),
    getCompleted: vi.fn().mockResolvedValue([]),
    getFailed: vi.fn().mockResolvedValue([]),
    getDelayed: vi.fn().mockResolvedValue([]),
    isPaused: vi.fn().mockResolvedValue(false),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    clean: vi.fn().mockResolvedValue([]),
    name: 'test-queue',
  }

  return {
    default: vi.fn(() => mockQueue),
  }
})

// Mock de IORedis - client Redis
vi.mock('ioredis', () => ({
  default: vi.fn(() => ({
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn().mockResolvedValue(undefined),
  })),
}))
