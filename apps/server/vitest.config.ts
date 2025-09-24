import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/public/**', 'src/test', 'src/tests', 'src/entrypoints'],
    globals: true,
    setupFiles: ['src/test/setupTestEnvironment.ts'],
    globalSetup: ['src/test/globalTestSetup.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
  resolve: {
    alias: {
      '@repo/core': resolve(__dirname, '../../packages/core/src'),
    },
  },
})
