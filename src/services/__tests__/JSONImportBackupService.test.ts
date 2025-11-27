/**
 * Tests pour le service de sauvegarde et rollback des imports JSON
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSONImportBackupService, RollbackOptions } from '../JSONImportBackupService';

// Mock de Payload
const mockPayload = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByID: vi.fn(),
  find: vi.fn(),
  config: {
    collections: [
      { slug: 'auditlogs' }
    ]
  }
};

describe('JSONImportBackupService', () => {
  let backupService: JSONImportBackupService;

  beforeEach(() => {
    backupService = new JSONImportBackupService(mockPayload as any);
    vi.clearAllMocks();
    // S'assurer que la collection d'audit est présente
    mockPayload.config = {
      collections: [
        { slug: 'auditlogs' }
      ]
    };
  });

  describe('createPreImportBackup', () => {
    it('should create a backup snapshot with correct metadata', async () => {
      const jobId = 'job-123';
      const userId = 123;
      const importType = 'questions';
      const fileName = 'test.json';
      const affectedCollections = ['questions', 'categories'];

      const backupId = await backupService.createPreImportBackup(
        jobId,
        userId,
        importType,
        fileName,
        affectedCollections
      );

      expect(backupId).toMatch(/^backup-job-123-\d+$/);

      const backup = backupService.getBackupInfo(backupId);
      expect(backup).toEqual({
        id: backupId,
        jobId,
        userId,
        timestamp: expect.any(Date),
        description: `Sauvegarde automatique avant import ${importType} - ${fileName}`,
        affectedCollections,
        backupData: {},
        metadata: {
          totalEntities: 0,
          estimatedSize: 0,
          importType,
          fileName
        }
      });
    });
  });

  describe('backupEntity', () => {
    it('should backup entity with create operation', async () => {
      const backupId = await backupService.createPreImportBackup(
        'job-123',
        123,
        'questions',
        'test.json',
        ['questions']
      );

      const entityData = {
        id: 'q1',
        questionText: 'Test question',
        category: 'Test Category'
      };

      await backupService.backupEntity(
        backupId,
        'questions',
        'q1',
        'create',
        entityData
      );

      const backup = backupService.getBackupInfo(backupId);
      expect(backup?.backupData.questions).toHaveLength(1);
      expect(backup?.backupData.questions[0]).toEqual({
        id: 'q1',
        data: entityData,
        operation: 'create',
        originalData: undefined
      });
      expect(backup?.metadata.totalEntities).toBe(1);
    });

    it('should fetch entity data when not provided for delete operation', async () => {
      const backupId = await backupService.createPreImportBackup(
        'job-123',
        123,
        'questions',
        'test.json',
        ['questions']
      );

      const existingEntity = { id: 'q1', questionText: 'Existing question' };
      mockPayload.findByID.mockResolvedValue(existingEntity);

      await backupService.backupEntity(
        backupId,
        'questions',
        'q1',
        'delete'
      );

      expect(mockPayload.findByID).toHaveBeenCalledWith({
        collection: 'questions',
        id: 'q1'
      });

      const backup = backupService.getBackupInfo(backupId);
      expect(backup?.backupData.questions[0].data).toEqual(existingEntity);
    });
  });

  describe('executeRollback', () => {
    it('should execute complete rollback successfully', async () => {
      const jobId = 'job-123';
      const userId = 123;
      const backupId = await backupService.createPreImportBackup(
        jobId,
        userId,
        'questions',
        'test.json',
        ['questions']
      );

      // Ajouter des entités à la sauvegarde
      await backupService.backupEntity(backupId, 'questions', 'q1', 'create', { id: 'q1', text: 'Q1' });
      await backupService.backupEntity(backupId, 'questions', 'q2', 'update', { id: 'q2', text: 'Q2 Updated' }, { id: 'q2', text: 'Q2 Original' });

      // Mock des opérations Payload
      mockPayload.delete.mockResolvedValue({ id: 'q1' });
      mockPayload.update.mockResolvedValue({ id: 'q2' });
      mockPayload.findByID.mockResolvedValue({ role: 'admin' }); // Pour la vérification des permissions

      const options: RollbackOptions = {
        reason: 'Test rollback',
        dryRun: false,
        preserveRelations: true
      };

      const result = await backupService.executeRollback(jobId, userId, options);

      expect(result.success).toBe(true);
      expect(result.entitiesRemoved).toHaveLength(1);
      expect(result.entitiesRestored).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalProcessed).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);

      expect(mockPayload.delete).toHaveBeenCalledWith({
        collection: 'questions',
        id: 'q1'
      });

      expect(mockPayload.update).toHaveBeenCalledWith({
        collection: 'questions',
        id: 'q2',
        data: { id: 'q2', text: 'Q2 Original' }
      });
    });

    it('should perform dry-run rollback without making changes', async () => {
      const jobId = 'job-123';
      const userId = 123;
      const backupId = await backupService.createPreImportBackup(
        jobId,
        userId,
        'questions',
        'test.json',
        ['questions']
      );

      await backupService.backupEntity(backupId, 'questions', 'q1', 'create', { id: 'q1' });

      mockPayload.findByID.mockResolvedValue({ role: 'admin' });

      const options: RollbackOptions = {
        reason: 'Test dry-run',
        dryRun: true
      };

      const result = await backupService.executeRollback(jobId, userId, options);

      expect(result.success).toBe(true);
      expect(result.entitiesRemoved[0].type).toBe('would_be_removed');
      expect(mockPayload.delete).not.toHaveBeenCalled();
      expect(mockPayload.update).not.toHaveBeenCalled();
    });

    it('should handle permission errors', async () => {
      const jobId = 'job-123';
      const userId = 123;
      const differentUserId = 456;

      const backupId = await backupService.createPreImportBackup(
        jobId,
        differentUserId, // Différent utilisateur
        'questions',
        'test.json',
        ['questions']
      );

      mockPayload.findByID.mockResolvedValue({ role: 'user' }); // Pas admin

      const options: RollbackOptions = {
        reason: 'Test permission error'
      };

      const result = await backupService.executeRollback(jobId, userId, options);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Permissions insuffisantes');
    });
  });

  describe('validateRollbackPossible', () => {
    it('should validate rollback is possible', async () => {
      const jobId = 'job-123';
      const backupId = await backupService.createPreImportBackup(
        jobId,
        123,
        'questions',
        'test.json',
        ['questions']
      );

      await backupService.backupEntity(backupId, 'questions', 'q1', 'create', { id: 'q1' });

      // Mock que l'entité existe toujours
      mockPayload.findByID.mockResolvedValue({ id: 'q1' });

      const validation = await backupService.validateRollbackPossible(jobId);

      expect(validation.possible).toBe(true);
      expect(validation.reasons).toHaveLength(0);
    });

    it('should detect when backup is missing', async () => {
      const validation = await backupService.validateRollbackPossible('nonexistent-job');

      expect(validation.possible).toBe(false);
      expect(validation.reasons).toContain('Aucune sauvegarde trouvée pour ce job');
    });
  });

  describe('cleanupOldBackups', () => {
    it('should remove backups older than 7 days', async () => {
      const recentJobId = 'recent-job';
      const oldJobId = 'old-job';

      const recentBackupId = await backupService.createPreImportBackup(
        recentJobId,
        123,
        'questions',
        'recent.json',
        ['questions']
      );

      const oldBackupId = await backupService.createPreImportBackup(
        oldJobId,
        123,
        'questions',
        'old.json',
        ['questions']
      );

      // Simuler une sauvegarde ancienne
      const oldBackup = backupService.getBackupInfo(oldBackupId);
      if (oldBackup) {
        oldBackup.timestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 jours
      }

      const cleanedCount = await backupService.cleanupOldBackups();

      expect(cleanedCount).toBe(1);
      expect(backupService.getBackupInfo(recentBackupId)).not.toBeNull();
      expect(backupService.getBackupInfo(oldBackupId)).toBeNull();
    });
  });
});