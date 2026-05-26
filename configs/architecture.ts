import boundaries from 'eslint-plugin-boundaries'
import type { ESLintConfig } from './types'

const config = [
  {
    plugins: {
      boundaries,
    },

    settings: {
      'boundaries/elements': [
        { type: 'primitive', pattern: 'lib/primitive/**/*' },
        { type: 'contract', pattern: 'lib/contract/**/*' },
        { type: 'styling', pattern: 'lib/styling/**/*' },
        { type: 'adapter-utils', pattern: 'lib/adapter-utils/**/*' },
        { type: 'bench', pattern: 'lib/bench/**/*' },
        { type: 'core', pattern: 'packages/core/**/*' },
        { type: 'react', pattern: 'packages/react/**/*' },
        { type: 'vue', pattern: 'packages/vue/**/*' },
        { type: 'preact', pattern: 'packages/preact/**/*' },
        { type: 'solid', pattern: 'packages/solid/**/*' },
        { type: 'svelte', pattern: 'packages/svelte/**/*' },
        { type: 'tailwind', pattern: 'packages/tailwind/**/*' },
        { type: 'eslint-plugin', pattern: 'packages/eslint-plugin/**/*' },
        { type: 'ts-plugin', pattern: 'packages/ts-plugin/**/*' },
        { type: 'codemod', pattern: 'packages/codemod/**/*' },
      ],

      'boundaries/ignore': ['**/dist/**', '**/node_modules/**'],
    },

    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',

          rules: [
            {
              from: [{ type: 'core' }],
              disallow: [
                {
                  dependency: {
                    source: [
                      'react',
                      'react-dom',
                      'vue',
                      '@vue/**',
                      'preact',
                      'svelte',
                      'svelte/**',
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
