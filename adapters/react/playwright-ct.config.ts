import { defineConfig, devices } from '@playwright/experimental-ct-react'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

// The CT bundler is standalone Vite — it does not read the workspace tsconfig `paths`, so every
// `@praxis-kit/*` entry the fixtures pull in is aliased to its source here. Sub-entries must
// precede their root alias to avoid prefix-match collisions.
const primitiveRoot = resolve('../../lib/primitive/src')
const reactRoot = resolve('src')

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.pw.spec.tsx',
  outputDir: '.playwright/results',
  snapshotDir: '.playwright/snapshots',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    ctPort: 3101,
    ctViteConfig: {
      plugins: [react()],
      resolve: {
        alias: [
          { find: /^@praxis-kit\/react\/(.+)$/, replacement: `${reactRoot}/$1` },
          { find: '@praxis-kit/react', replacement: resolve('src/index.ts') },

          {
            find: '@praxis-kit/core/primitive',
            replacement: resolve('../../packages/core/src/primitive.ts'),
          },
          {
            find: '@praxis-kit/core/contract',
            replacement: resolve('../../packages/core/src/contract.ts'),
          },
          {
            find: '@praxis-kit/core/styling',
            replacement: resolve('../../packages/core/src/styling.ts'),
          },
          { find: '@praxis-kit/core', replacement: resolve('../../packages/core/src/index.ts') },

          { find: /^@praxis-kit\/primitive\/(.+)$/, replacement: `${primitiveRoot}/$1/index.ts` },
          { find: '@praxis-kit/primitive', replacement: `${primitiveRoot}/index.ts` },

          {
            find: '@praxis-kit/contract-props',
            replacement: resolve('../../lib/contract-props/src/index.ts'),
          },
          {
            find: '@praxis-kit/adapter-utils/testing',
            replacement: resolve('../../lib/adapter-utils/src/testing/index.ts'),
          },
          {
            find: '@praxis-kit/adapter-utils',
            replacement: resolve('../../lib/adapter-utils/src/index.ts'),
          },
          {
            find: '@praxis-kit/runtime',
            replacement: resolve('../../lib/runtime/src/index.ts'),
          },
          {
            find: '@praxis-kit/diagnostics',
            replacement: resolve('../../lib/diagnostics/src/index.ts'),
          },
          { find: '@praxis-kit/styling', replacement: resolve('../../lib/styling/src/index.ts') },
          {
            find: '@praxis-kit/playwright',
            replacement: resolve('../../lib/playwright/src/index.ts'),
          },
        ],
      },
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
