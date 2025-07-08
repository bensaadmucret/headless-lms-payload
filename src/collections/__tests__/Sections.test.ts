import { Sections } from '../Sections';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Sections Collection', () => {
  it('should have the correct slug', () => {
    expect(Sections.slug).toBe('sections');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Sections.fields as Field[], [
      'title', 'course', 'order'
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Sections, 'afterChange');
    expectHookExists(Sections, 'afterDelete');
  });
});
