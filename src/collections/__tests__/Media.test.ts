import { Media } from '../Media';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Media Collection', () => {
  it('should have the correct slug', () => {
    expect(Media.slug).toBe('media');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Media.fields as Field[], [
      'alt', 'caption'
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Media, 'afterChange');
    expectHookExists(Media, 'afterDelete');
  });
});
