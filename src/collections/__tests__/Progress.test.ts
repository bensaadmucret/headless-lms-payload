import { Progress } from '../Progress';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Progress Collection', () => {
  it('should have the correct slug', () => {
    expect(Progress.slug).toBe('progress');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Progress.fields as Field[], [
      'user', 'lesson', 'status', 'score'
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Progress, 'afterChange');
    expectHookExists(Progress, 'afterDelete');
  });
});
