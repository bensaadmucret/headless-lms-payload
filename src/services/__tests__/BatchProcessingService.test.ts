/**
 * Tests pour BatchProcessingService
 * Tests basiques pour vérifier le fonctionnement du traitement par lots
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatchProcessingService } from '../BatchProcessingService';
import { QuestionImportData } from '../../types/jsonImport';

// Mock des services dépendants
vi.mock('../JSONProcessingService', () => ({
  JSONProcessingService: vi.fn().mockImplementation(() => ({
    processImportData: vi.fn().mockResolvedValue({
      success: true,
      results: [],
      errors: [],
      createdIds: [],
      summary: { totalProcessed: 0, successful: 0, failed: 0, skipped: 0 }
    })
  }))
}));

vi.mock('../JSONValidationService', () => ({
  JSONValidationService: vi.fn().mockImplementation(() => ({
    validateImportData: vi.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      summary: { totalItems: 1, validItems: 1, invalidItems: 0, duplicates: 0, missingCategories: [] }
    })
  }))
}));

vi.mock('../BatchErrorManager', () => ({
  BatchErrorManager: vi.fn().mockImplementation(() => ({
    createBackup: vi.fn().mockResolvedValue('backup-id'),
    handleJobErrors: vi.fn().mockResolvedValue({
      shouldContinue: true,
      shouldRollback: false,
      actions: []
    }),
    generateDetailedReport: vi.fn(),
    exportReportAsJSON: vi.fn(),
    exportReportAsCSV: vi.fn(),
    getErrorStatistics: vi.fn()
  }))
}));

describe('BatchProcessingService', () => {
  let batchService: BatchProcessingService;

  beforeEach(() => {
    batchService = new BatchProcessingService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('startBatchProcessing', () => {
    it('devrait créer un job et retourner un ID', async () => {
      const mockData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: {
          source: 'Test',
          level: 'PASS'
        },
        questions: [
          {
            questionText: 'Test question?',
            options: [
              { text: 'Option A', isCorrect: true },
              { text: 'Option B', isCorrect: false }
            ],
            explanation: 'Test explanation',
            category: 'Test Category',
            difficulty: 'easy',
            level: 'PASS'
          }
        ]
      };

      const jobId = await batchService.startBatchProcessing(
        mockData,
        'test-user-id',
        'test-file.json',
        'json',
        { chunkSize: 10 }
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(jobId).toMatch(/^batch_/);
    });
  });

  describe('Job Management', () => {
    it('devrait pouvoir récupérer le statut d\'un job', async () => {
      const mockData: QuestionImportData = {
        version: '1.0',
        type: 'questions',
        metadata: { source: 'Test', level: 'PASS' },
        questions: [{
          questionText: 'Test?',
          options: [{ text: 'A', isCorrect: true }],
          explanation: 'Test',
          category: 'Test',
          difficulty: 'easy',
          level: 'PASS'
        }]
      };

      const jobId = await batchService.startBatchProcessing(
        mockData,
        'test-user-id',
        'test-file.json',
        'json'
      );

      const jobStatus = batchService.getJobStatus(jobId);
      
      expect(jobStatus).toBeDefined();
      expect(jobStatus?.id).toBe(jobId);
      expect(jobStatus?.userId).toBe('test-user-id');
      expect(jobStatus?.fileName).toBe('test-file.json');
    });
  });

  describe('Statistics', () => {
    it('devrait retourner des statistiques globales', () => {
      const stats = batchService.getGlobalStats();
      
      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('activeJobs');
      expect(stats).toHaveProperty('completedJobs');
      expect(stats).toHaveProperty('failedJobs');
      expect(stats).toHaveProperty('totalItemsProcessed');
      
      expect(typeof stats.totalJobs).toBe('number');
      expect(typeof stats.activeJobs).toBe('number');
      expect(typeof stats.completedJobs).toBe('number');
      expect(typeof stats.failedJobs).toBe('number');
      expect(typeof stats.totalItemsProcessed).toBe('number');
    });
  });

  describe('Cleanup', () => {
    it('devrait pouvoir nettoyer les anciens jobs', () => {
      const cleanedCount = batchService.cleanupOldJobs();
      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });
});