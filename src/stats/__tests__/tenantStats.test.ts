/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import * as tenantStats from '../tenantStats';

beforeEach(() => {
  vi.restoreAllMocks();
});
import payload from 'payload';

describe('tenantStats module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('getUserCountForTenant returns correct user count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 5,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getUserCountForTenant('tenant1');
    expect(count).toBe(5);
  });

  it('getUserCountForTenant returns 0 on error', async () => {
    vi.spyOn(payload, 'find').mockRejectedValueOnce(new Error('fail'));
    const count = await tenantStats.getUserCountForTenant('tenant1');
    expect(count).toBe(0);
  });

  it('getActiveUserCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 2,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getActiveUserCountForTenant('tenant1');
    expect(count).toBe(2);
  });

  it('getCourseCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 3,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getCourseCountForTenant('tenant1');
    expect(count).toBe(3);
  });

  it('getQuizCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 4,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getQuizCountForTenant('tenant1');
    expect(count).toBe(4);
  });

  it('getMediaCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 7,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getMediaCountForTenant('tenant1');
    expect(count).toBe(7);
  });

  it('getStorageUsedForTenant returns correct size', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [{ filesize: 1048576 } as any, { filesize: 2097152 } as any],
      totalDocs: 2,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const size = await tenantStats.getStorageUsedForTenant('tenant1');
    expect(size).toBe(3); // 3 Mo
  });

// --- Tests unitaires simples (avec spyOn) ---

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('tenantStats module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('getUserCountForTenant returns correct user count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 5,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getUserCountForTenant('tenant1');
    expect(count).toBe(5);
  });

  it('getUserCountForTenant returns 0 on error', async () => {
    vi.spyOn(payload, 'find').mockRejectedValueOnce(new Error('fail'));
    const count = await tenantStats.getUserCountForTenant('tenant1');
    expect(count).toBe(0);
  });

  it('getActiveUserCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 2,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getActiveUserCountForTenant('tenant1');
    expect(count).toBe(2);
  });

  it('getCourseCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 3,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getCourseCountForTenant('tenant1');
    expect(count).toBe(3);
  });

  it('getQuizCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 4,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getQuizCountForTenant('tenant1');
    expect(count).toBe(4);
  });

  it('getMediaCountForTenant returns correct count', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [],
      totalDocs: 7,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const count = await tenantStats.getMediaCountForTenant('tenant1');
    expect(count).toBe(7);
  });

  it('getStorageUsedForTenant returns correct size', async () => {
    vi.spyOn(payload, 'find').mockResolvedValueOnce({
      docs: [{ filesize: 1048576 } as any, { filesize: 2097152 } as any],
      totalDocs: 2,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 0,
      page: 1,
      totalPages: 1,
      pagingCounter: 1,
      nextPage: null,
      prevPage: null
    });
    const size = await tenantStats.getStorageUsedForTenant('tenant1');
    expect(size).toBe(3); // 3 Mo
  });
});

// --- Tests d'agrégation isolés (avec doMock/import dynamique) ---

describe('tenantStats module (mocked aggregation)', () => {
  it('isQuotaExceededForTenant returns true if quota exceeded', async () => {
    // Mocks explicites pour chaque dépendance
    const deps = {
      getUserCountForTenant: vi.fn().mockResolvedValue(2),
      getStorageUsedForTenant: vi.fn().mockResolvedValue(2),
      findTenantById: vi.fn().mockResolvedValue({ quotas: { maxUsers: 1, maxStorage: 1 } }),
    };
    const { isQuotaExceededForTenant } = await import('../tenantStats');
    const res = await isQuotaExceededForTenant('tenant1', deps);
    expect(res).toBe(true);
  });

  it('getAllTenantStats returns aggregated stats', async () => {
    // Mocks explicites pour chaque fonction dépendante
    const mocks = {
      getUserCountForTenant: vi.fn().mockResolvedValue(1),
      getActiveUserCountForTenant: vi.fn().mockResolvedValue(1),
      getCourseCountForTenant: vi.fn().mockResolvedValue(1),
      getQuizCountForTenant: vi.fn().mockResolvedValue(1),
      getMediaCountForTenant: vi.fn().mockResolvedValue(1),
      getStorageUsedForTenant: vi.fn().mockResolvedValue(1),
      getLoginCountForTenant: vi.fn().mockResolvedValue(1),
      getActionCountForTenant: vi.fn().mockResolvedValue(1),
      getActivePlansForTenant: vi.fn().mockResolvedValue(1),
      isQuotaExceededForTenant: vi.fn().mockResolvedValue(false),
      getAvgCourseCompletionForTenant: vi.fn().mockResolvedValue(0.5),
    };
    const { getAllTenantStats } = await import('../tenantStats');
    const stats = await getAllTenantStats('tenant1', mocks);
    expect(stats).toEqual({
      userCount: 1,
      activeUserCount: 1,
      courseCount: 1,
      quizCount: 1,
      mediaCount: 1,
      storageUsedMB: 1,
      loginCount30d: 1,
      actionsCount30d: 1,
      activePlans: 1,
      quotaExceeded: false,
      avgCourseCompletion: 0.5,
    });
  });
});
});
