import { vi } from 'vitest';

export class JSONImportBackupService {
  createBackup = vi.fn();
  restoreBackup = vi.fn();
  getJobStatus = vi.fn();
  cleanupOldBackups = vi.fn();
  validateRollback = vi.fn();
}
