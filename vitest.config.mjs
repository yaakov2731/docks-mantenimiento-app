import { defineConfig } from 'vitest/config'
import path from 'path'

const root = path.resolve(import.meta.dirname ?? '.')

export default defineConfig({
  test: {
    root,
    globals: true,
    environmentMatchGlobs: [
      ['client/src/**/*.test.tsx', 'jsdom'],
      ['client/src/**/*.test.ts', 'jsdom'],
    ],
    setupFiles: ['./server/test/setup.ts', './client/src/test/setup.ts'],
    include: [
      'server/**/*.test.ts',
      'client/src/**/*.test.ts',
      'client/src/**/*.test.tsx',
    ],
    exclude: [
      '.worktrees/**',
      '.preview-deploy-*/**',
      'node_modules/**',
      'dist/**',
    ],
  },
})
