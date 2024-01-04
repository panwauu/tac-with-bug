import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'src/test', 'src/tests', 'src/entrypoints'],
    globals: true,
    setupFiles: ['src/test/setupTestEnvironment.ts'],
    globalSetup: ['src/test/globalTestSetup.ts'],
    fileParallelism: false,
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
    },
  },
})
