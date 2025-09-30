import ColorSchemes from '../ColorSchemes';
import type { Field } from 'payload';
import { expectFieldsToExist } from './collectionTestHelper';

describe('ColorSchemes Collection', () => {
  it('should have the correct slug', () => {
    expect(ColorSchemes.slug).toBe('color-schemes');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(ColorSchemes.fields as Field[], [
      'name', 'isDefault', 'isActive', 'theme'
    ]);
  });
});
