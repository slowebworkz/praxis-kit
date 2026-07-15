import { defineConfig, devices } from '@playwright/experimental-ct-vue'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

// Sub-entries must precede their root alias to avoid prefix-match collisions.
const sharedRoot = resolve('../../lib/primitive/src')
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
          // @praxis-kit/vue sub-entries
          { find: /^@praxis-kit\/vue\/(.+)$/, replacement: `${vueRoot}/$1` },
          { find: '@praxis-kit/vue', replacement: resolve('src/index.ts') },

          // @praxis-kit/core sub-entries
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

          // @praxis-kit/primitive sub-entries (directories with index.ts)
          { find: /^@praxis-kit\/primitive\/(.+)$/, replacement: `${sharedRoot}/$1/index.ts` },
          {
            find: '@praxis-kit/primitive',
            replacement: resolve('../../lib/primitive/src/index.ts'),
          },

          // @praxis-kit/contract sub-entries
          {
            find: '@praxis-kit/contract/types',
            replacement: resolve('../../lib/contract/src/types/index.ts'),
          },
          { find: '@praxis-kit/contract', replacement: resolve('../../lib/contract/src/index.ts') },

          // @praxis-kit/adapter-utils sub-entries
          {
            find: '@praxis-kit/adapter-utils/testing',
            replacement: resolve('../../lib/adapter-utils/src/testing/index.ts'),
          },
          {
            find: '@praxis-kit/adapter-utils',
            replacement: resolve('../../lib/adapter-utils/src/index.ts'),
          },

          // No known sub-entries for these
          {
            find: '@praxis-kit/primitive',
            replacement: resolve('../../lib/primitive/src/index.ts'),
          },
          { find: '@praxis-kit/styling', replacement: resolve('../../lib/styling/src/index.ts') },
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
