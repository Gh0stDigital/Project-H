import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Unit tests for the pure systems. Kept separate from vite.config.ts so the
 * app build and the test runner each stay typed against their own config
 * shape. No DOM environment is needed — every module under test is UI-free
 * by design.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
