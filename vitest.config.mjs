import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    environmentMatchGlobs: [
      ['client/src/**/*.test.tsx', 'jsdom'],
      ['client/src/**/*.test.ts', 'jsdom'],
    ],
    setupFiles: ['./server/test/setup.ts', './client/src/test/setup.ts'],
    include: ['server/**/*.test.ts', 'client/src/**/*.test.ts', 'client/src/**/*.test.tsx'],
  },
})
