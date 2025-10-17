/**
 * Tests pour le service d'audit des imports JSON
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSONImportAuditService, ImportSummary } from '../JSONImportAuditService';

// Mock de Payload
const mockPayload = {
  create: vi.fn(),
  find: vi.fn(),
  findByID: vi.fn()
};

describe('JSONImportAuditService', () => {
  let auditService: JSONImportAuditService;

  beforeEach(() => {
    auditService = new JSONImportAuditService(mockPayload as any);
    vi.clearAllMocks();
  });

  describe('logImportStarted', () => {
    it('should log import start with correct data', async () => {
      const userId = 123;
      const jobId = 'job-123';
      const fileName = 'test.json';
      const format = 'json';
      const importType = 'questions';
      const totalItems = 50;
      const options = { dryRun: false, batchSize: 10 };

      mockPayload.create.mockResolvedValue({ id: 'audit-1' });

      await auditService.logImportStarted(
        userId,
        jobId,
        fileName,
        format as any,
        importType as any,
        totalItems,
        options as any
      );

      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'auditlogs',
        data: expect.objectContaining({
          user: { relationTo: 'users', value: userId },
          action: 'import_started',
          collection: 'json-imports',
          documentId: jobId,
          diff: expect.objectContaining({
            importSummary: expect.objectContaining({
              fileName,
              format,
              importType,
              totalItems,
              options
            })
          })
        })
      });
    });

    it('should handle audit logging errors gracefully', async () => {
      mockPayload.create.mockRejectedValue(new Error('Database error'));

      // Ne devrait pas lever d'exception
      await expect(auditService.logImportStarted(
        123,
        'job-123',
        'test.json',
        'json' as any,
        'questions' as any,
        50,
        {} as any
      )).resolves.toBeUndefined();
    });
  });

  describe('logImportCompleted', () => {
    it('should log import completion with summary and created entities', async () => {
      const userId = 123;
      const jobId = 'job-123';
      const summary: ImportSummary = {
        fileName: 'test.json',
        format: 'json' as any,
        importType: 'questions' as any,
        totalItems: 50,
        processedItems: 50,
        successfulItems: 45,
        failedItems: 5,
        skippedItems: 0,
        duration: 120,
        options: {} as any
      };
      const createdEntities = [
        { collection: 'questions', id: 'q1', type: 'question' },
        { collection: 'questions', id: 'q2', type: 'question' }
      ];

      mockPayload.create.mockResolvedValue({ id: 'audit-2' });

      await auditService.logImportCompleted(userId, jobId, summary, createdEntities);

      expect(mockPayload.create).toHaveBeenCalledWith({
        collection: 'auditlogs',
        data: expect.objectContaining({
          action: 'import_completed',
          diff: expect.objectContaining({
            importSummary: expect.objectContaining({
              ...summary,
              createdEntities
            })
          })
        })
      });
    });
  });

  describe('generateActivityReport', () => {
    it('should generate comprehensive activity report', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockAuditLogs = {
        docs: [
          {
            action: 'import_started',
            user: { value: 123 },
            diff: {
              importSummary: {
                importType: 'questions',
                format: 'json',
                totalItems: 50
              }
            }
          },
          {
            action: 'import_completed',
            user: { value: 123 },
            diff: {
              importSummary: {
                importType: 'questions',
                format: 'json',
                processedItems: 50,
                successfulItems: 45
              }
            }
          },
          {
            action: 'import_failed',
            user: { value: 456 },
            diff: {
              importSummary: {
                importType: 'flashcards',
                format: 'csv',
                errors: [
                  { type: 'validation', message: 'Error 1' },
                  { type: 'database', message: 'Error 2' }
                ]
              }
            }
          }
        ]
      };

      mockPayload.find.mockResolvedValue(mockAuditLogs);

      const report = await auditService.generateActivityReport(startDate, endDate);

      expect(report).toEqual({
        totalImports: 1,
        successfulImports: 1,
        failedImports: 1,
        cancelledImports: 0,
        totalItemsProcessed: 50,
        totalItemsCreated: 45,
        mostActiveUsers: [
          { userId: 123, importCount: 2 },
          { userId: 456, importCount: 1 }
        ],
        errorSummary: [
          { errorType: 'validation', count: 1 },
          { errorType: 'database', count: 1 }
        ],
        importsByType: {
          questions: 2,
          flashcards: 1
        },
        importsByFormat: {
          json: 2,
          csv: 1
        }
      });

      expect(mockPayload.find).toHaveBeenCalledWith({
        collection: 'auditlogs',
        where: {
          and: [
            { collection: { equals: 'json-imports' } },
            { timestamp: { greater_than_equal: startDate } },
            { timestamp: { less_than_equal: endDate } }
          ]
        },
        limit: 1000,
        sort: '-timestamp'
      });
    });
  });
});