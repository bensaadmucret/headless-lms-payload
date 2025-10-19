import { vi } from 'vitest';

export class BatchProcessingService {
  initializeServices = vi.fn();
  getJobStatus = vi.fn();
  startProcessing = vi.fn();
  cancelJob = vi.fn();
  getAllJobs = vi.fn();
}
