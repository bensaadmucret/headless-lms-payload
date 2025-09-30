import { Prerequisites } from '../Prerequisites';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Prerequisites Collection', () => {
  it('should have the correct slug', () => {
    expect(Prerequisites.slug).toBe('prerequisites');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Prerequisites.fields as Field[], [
      'name', 'description'
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Prerequisites, 'afterChange');
    expectHookExists(Prerequisites, 'afterDelete');
  });
});
