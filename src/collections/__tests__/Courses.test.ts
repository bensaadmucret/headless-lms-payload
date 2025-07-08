import { Courses } from '../Courses';
import type { Field } from 'payload';
import { expectFieldsToExist, expectHookExists } from './collectionTestHelper';

describe('Courses Collection', () => {
  it('should have the correct slug', () => {
    expect(Courses.slug).toBe('courses');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Courses.fields as Field[], [
      'title', 'description', 'level', 'author', 'published', 'tags', 'duration'
    ]);
  });

  it('should include afterChange and afterDelete hooks', () => {
    expectHookExists(Courses, 'afterChange');
    expectHookExists(Courses, 'afterDelete');
  });
});
