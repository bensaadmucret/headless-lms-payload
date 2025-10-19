import { vi } from 'vitest';

export class JSONValidationService {
  validateImportData = vi.fn().mockResolvedValue({
    isValid: true,
    errors: [],
    warnings: []
  });
}
