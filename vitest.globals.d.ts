import type { TestAPI, SuiteAPI } from 'vitest'

declare global {
  const describe: SuiteAPI
  const it: TestAPI
  const expect: typeof import('vitest').expect
  const test: TestAPI
  const beforeAll: typeof import('vitest').beforeAll
  const afterAll: typeof import('vitest').afterAll
  const beforeEach: typeof import('vitest').beforeEach
  const afterEach: typeof import('vitest').afterEach
}