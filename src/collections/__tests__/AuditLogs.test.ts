import AuditLogs from '../AuditLogs';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('AuditLogs Collection', () => {
  it('should have the correct slug', () => {
    expect(AuditLogs.slug).toBe('auditlogs');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(AuditLogs.fields as Field[], [
      'user',
      'action',
      'collection',
      'documentId',
      'diff',
    ]);
  });

  it('should include hooks if defined', () => {
    expectHookExists(AuditLogs, 'afterChange');
    expectHookExists(AuditLogs, 'afterDelete');
  });
});
