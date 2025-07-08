import { Quizzes } from '../Quizzes';
import type { Field } from 'payload';
import { expectFieldsToExist } from './collectionTestHelper';

describe('Quizzes Collection', () => {
  it('should have the correct slug', () => {
    expect(Quizzes.slug).toBe('quizzes');
  });

  it('should define all expected fields', () => {
    expectFieldsToExist(Quizzes.fields as Field[], [
      'title', 'questions', 'course'
    ]);
  });
});
