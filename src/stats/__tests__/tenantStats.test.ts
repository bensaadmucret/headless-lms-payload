import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tenantStats from '../tenantStats';
import payload from 'payload';

vi.mock('payload');

const mockFind = payload.find as unknown as jest.Mock;
const mockFindByID = payload.findByID as unknown as jest.Mock;

describe('tenantStats module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getUserCountForTenant returns correct user count', async () => {
    mockFind.mockResolvedValueOnce({ totalDocs: 5 });
    const count = await tenantStats.getUserCountForTenant('tenant1');
    expect(count).toBe(5);
  });

  it('getUserCountForTenant returns 0 on error', async () => {
    mockFind.mockRejectedValueOnce(new Error('fail'));
    const count = await tenantStats.getUserCountForTenant('tenant1');
    expect(count).toBe(0);
  });

  it('getActiveUserCountForTenant returns correct count', async () => {
    mockFind.mockResolvedValueOnce({ totalDocs: 2 });
    const count = await tenantStats.getActiveUserCountForTenant('tenant1');
    expect(count).toBe(2);
  });

  it('getCourseCountForTenant returns correct count', async () => {
    mockFind.mockResolvedValueOnce({ totalDocs: 3 });
    const count = await tenantStats.getCourseCountForTenant('tenant1');
    expect(count).toBe(3);
  });

  it('getQuizCountForTenant returns correct count', async () => {
    mockFind.mockResolvedValueOnce({ totalDocs: 4 });
    const count = await tenantStats.getQuizCountForTenant('tenant1');
    expect(count).toBe(4);
  });

  it('getMediaCountForTenant returns correct count', async () => {
    mockFind.mockResolvedValueOnce({ totalDocs: 7 });
    const count = await tenantStats.getMediaCountForTenant('tenant1');
    expect(count).toBe(7);
  });

  it('getStorageUsedForTenant returns correct size', async () => {
    mockFind.mockResolvedValueOnce({ docs: [{ size: 1048576 }, { size: 2097152 }] });
    const size = await tenantStats.getStorageUsedForTenant('tenant1');
    expect(size).toBe(3); // 3 Mo
  });

  it('isQuotaExceededForTenant returns true if quota exceeded', async () => {
    mockFindByID.mockResolvedValueOnce({ maxUsers: 1, maxStorageMB: 1 });
    vi.spyOn(tenantStats, 'getUserCountForTenant').mockResolvedValueOnce(2);
    vi.spyOn(tenantStats, 'getStorageUsedForTenant').mockResolvedValueOnce(2);
    const res = await tenantStats.isQuotaExceededForTenant('tenant1');
    expect(res).toBe(true);
  });

  it('getAllTenantStats returns aggregated stats', async () => {
    vi.spyOn(tenantStats, 'getUserCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getActiveUserCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getCourseCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getQuizCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getMediaCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getStorageUsedForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getLoginCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getActionCountForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'getActivePlansForTenant').mockResolvedValueOnce(1);
    vi.spyOn(tenantStats, 'isQuotaExceededForTenant').mockResolvedValueOnce(false);
    vi.spyOn(tenantStats, 'getAvgCourseCompletionForTenant').mockResolvedValueOnce(0.5);
    const stats = await tenantStats.getAllTenantStats('tenant1');
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
