import type { Config } from 'jest'

const config: Config = {
  transformIgnorePatterns: [
    '/node_modules/(?!payload|@payloadcms/richtext-lexical)',
  ],
  rootDir: '.',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^payload$': '<rootDir>/__mocks__/payload.js',
    '^@payloadcms/richtext-lexical$': '<rootDir>/__mocks__/richtext-lexical.js',
  },

  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.ts',
    '<rootDir>/src/**/__tests__/**/*.test.tsx',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**/*',
    // Exclure explicitement toutes les pages Next.js et fichiers JSX non testables par Jest
    '!src/app/**/*.{ts,tsx}',
    '!src/pages/**/*.{ts,tsx}',
    '!src/**/page.tsx',
    '!src/**/layout.tsx',
    '!src/**/error.tsx',
    '!src/**/loading.tsx',
    // Exclure tous les composants React, providers et blocks/formulaires du coverage pour éviter les erreurs Babel/JSX
    '!src/components/**/*.{ts,tsx}',
    '!src/providers/**/*.{ts,tsx}',
    '!src/blocks/**/*.{ts,tsx}',
    '!src/fields/**/*.{ts,tsx}',
    '!src/collections/**/*.{ts,tsx}',
    '!src/access/**/*.{ts,tsx}',
    '!src/headers/**/*.{ts,tsx}',
    '!src/footer/**/*.{ts,tsx}',
    '!src/heros/**/*.{ts,tsx}',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  verbose: true,
}

export default config
