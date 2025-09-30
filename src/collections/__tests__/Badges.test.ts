import { Badges } from '../Badges';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Badges Collection', () => {
  it('should have the correct slug', () => {
    expect(Badges.slug).toBe('badges');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Badges.fields as Field[], [
      'name',
      'description',
      'icon',
      'criteria',
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Badges, 'afterChange');
    expectHookExists(Badges, 'afterDelete');
  });
});
