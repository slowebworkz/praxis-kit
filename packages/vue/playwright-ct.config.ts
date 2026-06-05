import { defineConfig, devices } from '@playwright/experimental-ct-vue'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

// Sub-entries must precede their root alias to avoid prefix-match collisions.
const sharedRoot = resolve('../shared/src')
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
          // @praxis-ui/vue sub-entries
          { find: /^@praxis-ui\/vue\/(.+)$/, replacement: `${vueRoot}/$1` },
          { find: '@praxis-ui/vue', replacement: resolve('src/index.ts') },

          // @praxis-ui/core sub-entries
          { find: '@praxis-ui/core/primitive', replacement: resolve('../core/src/primitive.ts') },
          { find: '@praxis-ui/core/contract', replacement: resolve('../core/src/contract.ts') },
          { find: '@praxis-ui/core/styling', replacement: resolve('../core/src/styling.ts') },
          { find: '@praxis-ui/core', replacement: resolve('../core/src/index.ts') },

          // @praxis-ui/shared sub-entries (directories with index.ts)
          { find: /^@praxis-ui\/shared\/(.+)$/, replacement: `${sharedRoot}/$1/index.ts` },
          { find: '@praxis-ui/shared', replacement: resolve('../shared/src/index.ts') },

          // @praxis-ui/contract sub-entries
          {
            find: '@praxis-ui/contract/types',
            replacement: resolve('../../lib/contract/src/types/index.ts'),
          },
          { find: '@praxis-ui/contract', replacement: resolve('../../lib/contract/src/index.ts') },

          // @praxis-ui/adapter-utils sub-entries
          {
            find: '@praxis-ui/adapter-utils/testing',
            replacement: resolve('../../lib/adapter-utils/src/testing/index.ts'),
          },
          {
            find: '@praxis-ui/adapter-utils',
            replacement: resolve('../../lib/adapter-utils/src/index.ts'),
          },

          // No known sub-entries for these
          {
            find: '@praxis-ui/primitive',
            replacement: resolve('../../lib/primitive/src/index.ts'),
          },
          { find: '@praxis-ui/styling', replacement: resolve('../../lib/styling/src/index.ts') },
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
