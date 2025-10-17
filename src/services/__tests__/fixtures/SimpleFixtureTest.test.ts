/**
 * Simple test to verify fixture structure works
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Simple Fixture Test', () => {
  const fixturesPath = __dirname;

  it('should load a simple fixture', () => {
    const fixture = JSON.parse(
      readFileSync(join(fixturesPath, 'valid', 'questions-simple.json'), 'utf-8')
    );

    expect(fixture).toBeDefined();
    expect(fixture.version).toBe('1.0');
    expect(fixture.type).toBe('questions');
    expect(fixture.questions).toHaveLength(10);
    expect(fixture.questions[0].questionText).toContain('ventricule gauche');
  });

  it('should load all fixture directories', () => {
    expect(() => {
      readFileSync(join(fixturesPath, 'valid', 'questions-simple.json'), 'utf-8');
    }).not.toThrow();

    expect(() => {
      readFileSync(join(fixturesPath, 'invalid', 'missing-required-fields.json'), 'utf-8');
    }).not.toThrow();

    expect(() => {
      readFileSync(join(fixturesPath, 'edge-cases', 'unicode-characters.json'), 'utf-8');
    }).not.toThrow();
  });
});