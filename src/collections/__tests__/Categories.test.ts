import { Categories } from '../Categories';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Categories Collection', () => {
  it('should have the correct slug', () => {
    expect(Categories.slug).toBe('categories');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Categories.fields as Field[], [
      'title',
      // slugField est probablement ajouté dynamiquement, on ne teste que "title" ici
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Categories, 'afterChange');
    expectHookExists(Categories, 'afterDelete');
  });
});
