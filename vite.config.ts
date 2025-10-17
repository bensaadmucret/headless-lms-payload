import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/__tests__/**',
        'src/**/__mocks__/**',
        'src/app/**', // Next.js routes (tested separately)
        'src/**/types.ts',
        'src/**/*.d.ts',
        'node_modules/**',
      ],
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
      all: true,
    },
    // Load test environment variables
    env: {
      ...process.env,
    },
    setupFiles: ['dotenv/config', './vitest.setup.ts'],
  },
  // Load .env.test for test environment
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  // Optimize dependencies for tests
  optimizeDeps: {
    include: ['bull', 'ioredis'],
  },
})
