import { vi } from 'vitest';

export class JSONImportAuditService {
  logImportStart = vi.fn();
  logImportComplete = vi.fn();
  logImportError = vi.fn();
  generateActivityReport = vi.fn();
  getAuditHistory = vi.fn();
}
