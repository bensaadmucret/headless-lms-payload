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
      reporter: ['text', 'lcov'],
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
