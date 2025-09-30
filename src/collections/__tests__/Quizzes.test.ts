import { describe, it, expect } from 'vitest';
import { Quizzes } from '../Quizzes';

describe('Quizzes Collection', () => {
  it('should have the correct slug', () => {
    expect(Quizzes.slug).toBe('quizzes');
  });

  it('should define all expected fields', () => {
    expect(Quizzes.fields).toBeDefined();
    expect(Array.isArray(Quizzes.fields)).toBe(true);
    
    // Check for essential fields
    const fieldNames = Quizzes.fields.map(field => 'name' in field ? field.name : '');
    expect(fieldNames).toContain('title');
  });

  it('should have valid collection structure', () => {
    // Just check that the collection object is properly structured
    expect(typeof Quizzes).toBe('object');
    expect(Quizzes.slug).toBeDefined();
    expect(Quizzes.fields).toBeDefined();
  });
});
