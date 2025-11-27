import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getImportStatus } from '../importStatus';
import { triggerImport } from '../triggerImport';
import { simpleImportStatusEndpoint } from '../simpleImportStatus';
import { importQueue } from '../../jobs/queue';

// Mock the Bull queue used by triggerImport and ImportJobs hooks
vi.mock('../../jobs/queue', () => ({
  importQueue: {
    add: vi.fn(),
  },
}));

interface MockRes {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

const createMockRes = (): MockRes => {
  const json = vi.fn();
  const status = vi.fn().mockReturnThis();
  return { status, json } as unknown as MockRes;
};

describe('Import Jobs Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getImportStatus', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req: any = {
        payload: {},
        user: undefined,
        routeParams: { jobId: '123' },
      };
      const res = createMockRes();

      await getImportStatus(req, res as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentification requise',
      });
    });

    it("should return 400 when jobId is missing", async () => {
      const req: any = {
        payload: {},
        user: { id: '1', role: 'admin' },
        routeParams: {},
      };
      const res = createMockRes();

      await getImportStatus(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "ID du job d'import manquant",
      });
    });

    it('should return 404 when import job is not found', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue(null),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: '1', role: 'admin' },
        routeParams: { jobId: '42' },
      };
      const res = createMockRes();

      await getImportStatus(req, res as any);

      expect(payload.findByID).toHaveBeenCalledWith({
        collection: 'import-jobs',
        id: '42',
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Job d'import introuvable avec l'ID: 42",
      });
    });

    it('should return 403 when user is not owner and not admin/superadmin', async () => {
      const importJob = {
        id: '42',
        uploadedBy: 'other-user',
      };
      const payload = {
        findByID: vi.fn().mockResolvedValue(importJob),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: 'user-1', role: 'student' },
        routeParams: { jobId: '42' },
      };
      const res = createMockRes();

      await getImportStatus(req, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Accès non autorisé à ce job d'import",
      });
    });

    it('should return job status when user is owner', async () => {
      const importJob = {
        id: '42',
        fileName: 'file.json',
        importType: 'questions',
        status: 'completed',
        progress: 100,
        createdAt: '2025-01-01T00:00:00.000Z',
        completedAt: '2025-01-01T01:00:00.000Z',
        validationResults: { some: 'validation' },
        processingResults: { some: 'results' },
        errors: [],
        uploadedBy: 'user-1',
      };
      const payload = {
        findByID: vi.fn().mockResolvedValue(importJob),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: 'user-1', role: 'student' },
        routeParams: { jobId: '42' },
      };
      const res = createMockRes();

      await getImportStatus(req, res as any);

      expect(res.status).not.toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledTimes(1);

      const body = (res.json as any).mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(importJob.id);
      expect(body.data.fileName).toBe(importJob.fileName);
      expect(body.data.importType).toBe(importJob.importType);
      expect(body.data.status).toBe(importJob.status);
      expect(body.data.progress).toBe(importJob.progress);
    });

    it('should return 500 when an unexpected error occurs', async () => {
      const error = new Error('DB error');
      const payload = {
        findByID: vi.fn().mockRejectedValue(error),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: '1', role: 'admin' },
        routeParams: { jobId: '99' },
      };
      const res = createMockRes();

      await getImportStatus(req, res as any);

      expect(payload.logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      const body = (res.json as any).mock.calls[0][0];
      expect(body.error).toBe('DB error');
    });
  });

  describe('triggerImport', () => {
    it('should return 403 when user is not admin or superadmin', async () => {
      const req: any = {
        payload: {},
        user: { id: '1', role: 'student' },
        body: {},
      };
      const res = createMockRes();

      await triggerImport(req, res as any);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Accès non autorisé. Seuls les administrateurs peuvent déclencher des imports.',
      });
    });

    it('should return 400 when required body fields are missing', async () => {
      const req: any = {
        payload: {},
        user: { id: '1', role: 'admin' },
        body: {
          uploadedFileId: undefined,
          fileName: undefined,
          importType: undefined,
        },
      };
      const res = createMockRes();

      await triggerImport(req, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Données manquantes : uploadedFileId, fileName et importType sont requis',
      });
    });

    it('should return 404 when media file is not found', async () => {
      const payload = {
        findByID: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: '1', role: 'admin' },
        body: {
          uploadedFileId: 10,
          fileName: 'import.json',
          importType: 'questions',
        },
      };
      const res = createMockRes();

      await triggerImport(req, res as any);

      expect(payload.findByID).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Fichier média introuvable avec l'ID: 10",
      });
    });

    it('should create import job and enqueue bull job on success', async () => {
      const mediaFile = { id: 10, filename: 'import.json' };
      const importJob = {
        id: 42,
        fileName: 'import.json',
        importType: 'questions',
        status: 'pending',
        progress: 0,
      };
      const payload = {
        findByID: vi.fn().mockResolvedValue(mediaFile),
        create: vi.fn().mockResolvedValue(importJob),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: '1', role: 'admin' },
        body: {
          uploadedFileId: 10,
          fileName: 'import.json',
          importType: 'questions',
          createQuizContainer: false,
          quizMetadata: {},
        },
      };
      const res = createMockRes();

      (importQueue.add as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'bull-123' });

      await triggerImport(req, res as any);

      expect(payload.create).toHaveBeenCalledWith({
        collection: 'import-jobs',
        data: expect.objectContaining({
          uploadedFile: 10,
          fileName: 'import.json',
          importType: 'questions',
          status: 'pending',
          progress: 0,
          uploadedBy: '1',
        }),
      });

      expect(importQueue.add).toHaveBeenCalledWith(
        'process-import',
        {
          jobId: '42',
          userId: '1',
          importType: 'questions',
          fileName: 'import.json',
        },
        expect.objectContaining({
          attempts: 3,
        }),
      );

      expect(res.json).toHaveBeenCalledTimes(1);
      const body = (res.json as any).mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data.importJobId).toBe(42);
      expect(body.data.bullJobId).toBe('bull-123');
      expect(body.data.status).toBe('pending');
    });

    it('should return 500 when an unexpected error occurs', async () => {
      const error = new Error('Unexpected');
      const payload = {
        findByID: vi.fn().mockRejectedValue(error),
        logger: { error: vi.fn() },
      };
      const req: any = {
        payload,
        user: { id: '1', role: 'admin' },
        body: {
          uploadedFileId: 10,
          fileName: 'import.json',
          importType: 'questions',
        },
      };
      const res = createMockRes();

      await triggerImport(req, res as any);

      expect(payload.logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      const body = (res.json as any).mock.calls[0][0];
      expect(body.error).toBe('Unexpected');
    });
  });

  describe('simpleImportStatusEndpoint', () => {
    it('should return 401 when user is not authenticated', async () => {
      const req: any = {
        user: undefined,
        payload: {},
      };

      const response = await simpleImportStatusEndpoint.handler(req);

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentification requise');
    });

    it('should return recent import jobs for authenticated user', async () => {
      const importJobs = {
        totalDocs: 2,
        docs: [
          {
            id: '1',
            fileName: 'file1.json',
            status: 'completed',
            progress: 100,
            importType: 'questions',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: '2',
            fileName: 'file2.json',
            status: 'pending',
            progress: 10,
            importType: 'flashcards',
            createdAt: '2025-01-02T00:00:00.000Z',
          },
        ],
      };

      const req: any = {
        user: { id: '1', role: 'admin' },
        payload: {
          find: vi.fn().mockResolvedValue(importJobs),
        },
      };

      const response = await simpleImportStatusEndpoint.handler(req);

      expect(req.payload.find).toHaveBeenCalledWith({
        collection: 'import-jobs',
        limit: 10,
        sort: '-createdAt',
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data.totalJobs).toBe(2);
      expect(body.data.recentJobs).toHaveLength(2);
      expect(body.data.recentJobs[0]).toEqual(
        expect.objectContaining({
          id: '1',
          fileName: 'file1.json',
          status: 'completed',
          progress: 100,
          importType: 'questions',
        }),
      );
    });

    it('should return 500 when an unexpected error occurs', async () => {
      const req: any = {
        user: { id: '1', role: 'admin' },
        payload: {
          find: vi.fn().mockRejectedValue(new Error('DB failure')),
        },
      };

      const response = await simpleImportStatusEndpoint.handler(req);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('DB failure');
    });
  });
});
