import { defineConfig, devices } from '@playwright/experimental-ct-vue'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

// The CT bundler is standalone Vite — it does not read the workspace tsconfig `paths`, so every
// `@praxis-kit/*` entry the fixtures pull in is aliased to its source here. Sub-entries must
// precede their root alias to avoid prefix-match collisions.
const primitiveRoot = resolve('../../lib/primitive/src')
const vueRoot = resolve('src')

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.pw.spec.ts',
  outputDir: '.playwright/results',
  snapshotDir: '.playwright/snapshots',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',

  use: {
    ctPort: 3102,
    ctViteConfig: {
      plugins: [vue()],
      resolve: {
        alias: [
          { find: /^@praxis-kit\/vue\/(.+)$/, replacement: `${vueRoot}/$1` },
          { find: '@praxis-kit/vue', replacement: resolve('src/index.ts') },

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
