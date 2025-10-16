import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIQuizAuditService } from '../AIQuizAuditService';

// Mock Payload
const mockPayload = {
  create: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  delete: vi.fn(),
};

describe('AIQuizAuditService', () => {
  let auditService: AIQuizAuditService;

  beforeEach(() => {
    auditService = new AIQuizAuditService(mockPayload as any);
    vi.clearAllMocks();
  });

  describe('startGenerationLog', () => {
    it('should create a generation log entry', async () => {
      const mockResult = { id: 'test-log-id' };
      mockPayload.create.mockResolvedValue(mockResult);

      const config = {
        subject: 'Test Subject',
        categoryId: 'cat-1',
        studentLevel: 'PASS' as const,
        questionCount: 5,
      };

      const logId = await auditService.startGenerationLog(
        'user-123',
        'ai_quiz_generation',
        config
      );

      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'generationlogs',
        data: expect.objectContaining({
          user: 'user-123',
          action: 'ai_quiz_generation',
          status: 'started',
          generationConfig: config,
          metadata: expect.objectContaining({
            environment: expect.any(String),
            version: '1.0.0',
          }),
          createdAt: expect.any(String),
        }),
      });

      expect(logId).toBe('test-log-id');
    });

    it('should handle creation errors gracefully', async () => {
      mockPayload.create.mockRejectedValue(new Error('Database error'));

      await expect(
        auditService.startGenerationLog('user-123', 'ai_quiz_generation', {})
      ).rejects.toThrow('Database error');
    });
  });

  describe('updateGenerationStatus', () => {
    it('should update log status', async () => {
      await auditService.updateGenerationStatus('log-123', 'in_progress');

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: {
          status: 'in_progress',
        },
      });
    });

    it('should set completedAt for final statuses', async () => {
      await auditService.updateGenerationStatus('log-123', 'success');

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: {
          status: 'success',
          completedAt: expect.any(String),
        },
      });
    });

    it('should handle update errors gracefully', async () => {
      mockPayload.update.mockRejectedValue(new Error('Update error'));

      // Should not throw - errors are logged but don't fail the operation
      await expect(
        auditService.updateGenerationStatus('log-123', 'success')
      ).resolves.toBeUndefined();
    });
  });

  describe('completeGenerationLog', () => {
    it('should complete a generation log with results', async () => {
      const result = {
        quizId: 'quiz-123',
        questionsCreated: 5,
        validationScore: 85,
      };

      const performance = {
        duration: 5000,
        aiResponseTime: 3000,
        retryCount: 1,
      };

      await auditService.completeGenerationLog('log-123', result, performance);

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: {
          status: 'success',
          result,
          performance,
          completedAt: expect.any(String),
        },
      });
    });
  });

  describe('failGenerationLog', () => {
    it('should fail a generation log with error details', async () => {
      const error = {
        type: 'ai_api_error' as const,
        message: 'API timeout',
        details: { code: 'TIMEOUT' },
      };

      const performance = {
        duration: 10000,
        retryCount: 3,
      };

      await auditService.failGenerationLog('log-123', error, performance);

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: {
          status: 'failed',
          error: {
            ...error,
            stackTrace: undefined, // Not in development
          },
          performance,
          completedAt: expect.any(String),
        },
      });
    });

    it('should include stack trace in development', async () => {
      // Mock process.env.NODE_ENV pour ce test
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true,
        enumerable: true,
      });

      const error = {
        type: 'unknown_error' as const,
        message: 'Unknown error',
        stackTrace: 'Error stack trace',
      };

      await auditService.failGenerationLog('log-123', error);

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: expect.objectContaining({
          error: expect.objectContaining({
            stackTrace: 'Error stack trace',
          }),
        }),
      });

      // Restaurer la valeur originale
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    });
  });

  describe('getGenerationMetrics', () => {
    it('should calculate metrics from logs', async () => {
      const mockLogs = {
        docs: [
          {
            action: 'ai_quiz_generation',
            status: 'success',
            result: { questionsCreated: 5, validationScore: 85, tokensUsed: 1000 },
            performance: { duration: 5000, aiResponseTime: 3000 },
            generationConfig: { studentLevel: 'PASS', difficulty: 'medium' },
          },
          {
            action: 'ai_quiz_generation',
            status: 'failed',
            error: { type: 'validation_failed' },
            performance: { duration: 2000 },
            generationConfig: { studentLevel: 'LAS', difficulty: 'hard' },
          },
          {
            action: 'auto_quiz_creation',
            status: 'success',
            result: { questionsCreated: 3, validationScore: 92 },
            performance: { duration: 7000, aiResponseTime: 4000 },
            generationConfig: { studentLevel: 'PASS', difficulty: 'easy' },
          },
        ],
      };

      mockPayload.find.mockResolvedValue(mockLogs);

      const metrics = await auditService.getGenerationMetrics('day');

      expect(metrics).toEqual({
        totalGenerations: 3,
        successfulGenerations: 2,
        failedGenerations: 1,
        successRate: expect.closeTo(66.67, 0.01), // 2/3 * 100, rounded
        averageDuration: expect.closeTo(4666.67, 0.01), // (5000 + 2000 + 7000) / 3, rounded
        averageValidationScore: 88.5, // (85 + 92) / 2
        totalQuestionsGenerated: 8, // 5 + 3
        totalTokensUsed: 1000,
        byAction: {
          ai_quiz_generation: 2,
          auto_quiz_creation: 1,
        },
        byStatus: {
          success: 2,
          failed: 1,
        },
        byErrorType: {
          validation_failed: 1,
        },
        byStudentLevel: {
          PASS: 2,
          LAS: 1,
        },
        byDifficulty: {
          medium: 1,
          hard: 1,
          easy: 1,
        },
        performanceStats: {
          minDuration: 2000,
          maxDuration: 7000,
          avgAiResponseTime: 3500, // (3000 + 4000) / 2
          avgValidationTime: 0,
          avgDatabaseTime: 0,
        },
      });
    });

    it('should handle empty logs', async () => {
      mockPayload.find.mockResolvedValue({ docs: [] });

      const metrics = await auditService.getGenerationMetrics('day');

      expect(metrics.totalGenerations).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageDuration).toBe(0);
    });
  });

  describe('getGenerationLogs', () => {
    it('should retrieve logs with filters', async () => {
      const mockResult = {
        docs: [{ id: 'log-1' }, { id: 'log-2' }],
        totalDocs: 2,
        page: 1,
      };

      mockPayload.find.mockResolvedValue(mockResult);

      const filters = {
        userId: 'user-123',
        action: 'ai_quiz_generation',
        status: 'success',
        limit: 10,
      };

      const result = await auditService.getGenerationLogs(filters);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'generationlogs',
        where: {
          user: { equals: 'user-123' },
          action: { equals: 'ai_quiz_generation' },
          status: { equals: 'success' },
        },
        sort: '-createdAt',
        limit: 10,
        page: 1,
      });

      expect(result).toBe(mockResult);
    });

    it('should handle date range filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await auditService.getGenerationLogs({
        startDate,
        endDate,
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'generationlogs',
        where: {
          createdAt: {
            greater_than_equal: startDate,
            less_than_equal: endDate,
          },
        },
        sort: '-createdAt',
        limit: 50,
        page: 1,
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old logs', async () => {
      const oldLogs = {
        docs: [
          { id: 'old-log-1' },
          { id: 'old-log-2' },
          { id: 'old-log-3' },
        ],
      };

      mockPayload.find.mockResolvedValue(oldLogs);
      mockPayload.delete.mockResolvedValue({});

      const deletedCount = await auditService.cleanupOldLogs(30);

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'generationlogs',
        where: {
          createdAt: { less_than: expect.any(Date) },
        },
        limit: 1000,
      });

      expect(mockPayload.delete).toHaveBeenCalledTimes(3);
      expect(deletedCount).toBe(3);
    });

    it('should handle deletion errors gracefully', async () => {
      const oldLogs = {
        docs: [{ id: 'old-log-1' }, { id: 'old-log-2' }],
      };

      mockPayload.find.mockResolvedValue(oldLogs);
      mockPayload.delete
        .mockResolvedValueOnce({}) // First deletion succeeds
        .mockRejectedValueOnce(new Error('Delete error')); // Second fails

      const deletedCount = await auditService.cleanupOldLogs(30);

      expect(deletedCount).toBe(1); // Only one successful deletion
    });
  });

  describe('logGeneration', () => {
    it('should log a complete generation in one call', async () => {
      mockPayload.create.mockResolvedValue({ id: 'log-123' });

      const config = { subject: 'Test', questionCount: 5 };
      const result = { quizId: 'quiz-123', questionsCreated: 5 };
      const performance = { duration: 5000 };

      const logId = await auditService.logGeneration(
        'user-123',
        'ai_quiz_generation',
        config,
        result,
        performance
      );

      expect(mockPayload.create).toHaveBeenCalled();
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: {
          status: 'success',
          result,
          performance,
          completedAt: expect.any(String),
        },
      });

      expect(logId).toBe('log-123');
    });
  });

  describe('logGenerationFailure', () => {
    it('should log a failed generation in one call', async () => {
      mockPayload.create.mockResolvedValue({ id: 'log-123' });

      const config = { subject: 'Test', questionCount: 5 };
      const error = { type: 'ai_api_error' as const, message: 'API failed' };
      const performance = { duration: 2000 };

      const logId = await auditService.logGenerationFailure(
        'user-123',
        'ai_quiz_generation',
        config,
        error,
        performance
      );

      expect(mockPayload.create).toHaveBeenCalled();
      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'generationlogs',
        id: 'log-123',
        data: {
          status: 'failed',
          error: expect.objectContaining(error),
          performance,
          completedAt: expect.any(String),
        },
      });

      expect(logId).toBe('log-123');
    });
  });
});