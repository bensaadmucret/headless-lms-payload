import Lessons from '../Lessons';
import type { Field } from 'payload';
import { expectFieldsToExist } from './collectionTestHelper';

describe('Lessons Collection', () => {
  it('should have the correct slug', () => {
    expect(Lessons.slug).toBe('lessons');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Lessons.fields as Field[], [
      'title', 'content', 'course', 'order', 'published'
    ]);
  });
});
