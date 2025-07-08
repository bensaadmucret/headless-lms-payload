import { vi, describe, it, expect } from 'vitest';
// Mock global de 'payload' pour éviter l'import ESM dans les tests
vi.mock('payload', () => ({
  // Ajouter ici les types/fonctions nécessaires si besoin
}));
// Mock du helper pour éviter import.meta.url sous Vitest
vi.mock('../getMediaDirname', () => ({
  getMediaDirname: () => process.cwd(),
}));
let Media: typeof import('../Media').Media;

beforeAll(async () => {
  ({ Media } = await import('../Media'));
});
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
