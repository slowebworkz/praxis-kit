import { defineConfig, devices } from '@playwright/experimental-ct-react'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

// Sub-entries must precede their root alias to avoid prefix-match collisions.
// Each entry maps the package's export path to its source file.
const sharedRoot = resolve('../shared/src')
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
          // @praxis-kit/react sub-entries
          { find: /^@praxis-kit\/react\/(.+)$/, replacement: `${reactRoot}/$1` },
          { find: '@praxis-kit/react', replacement: resolve('src/index.ts') },

          // @praxis-kit/core sub-entries
          { find: '@praxis-kit/core/primitive', replacement: resolve('../core/src/primitive.ts') },
          { find: '@praxis-kit/core/contract', replacement: resolve('../core/src/contract.ts') },
          { find: '@praxis-kit/core/styling', replacement: resolve('../core/src/styling.ts') },
          { find: '@praxis-kit/core', replacement: resolve('../core/src/index.ts') },

          // @praxis-kit/shared sub-entries (directories with index.ts)
          { find: /^@praxis-kit\/shared\/(.+)$/, replacement: `${sharedRoot}/$1/index.ts` },
          { find: '@praxis-kit/shared', replacement: resolve('../shared/src/index.ts') },

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
