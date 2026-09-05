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
        { type: 'react', pattern: 'adapters/react/**/*' },
        { type: 'vue', pattern: 'adapters/vue/**/*' },
        { type: 'preact', pattern: 'adapters/preact/**/*' },
        { type: 'solid', pattern: 'adapters/solid/**/*' },
        { type: 'svelte', pattern: 'adapters/svelte/**/*' },
        { type: 'lit', pattern: 'adapters/lit/**/*' },
        { type: 'web', pattern: 'adapters/web/**/*' },
        { type: 'tailwind', pattern: 'lib/tailwind/**/*' },
        { type: 'eslint-plugin', pattern: 'plugins/eslint/**/*' },
        { type: 'typescript-plugin', pattern: 'plugins/typescript/**/*' },
        { type: 'vite-plugin', pattern: 'plugins/vite/**/*' },
        { type: 'codemod', pattern: 'tooling/codemod/**/*' },
      ],

      'boundaries/ignore': ['**/dist/**', '**/node_modules/**'],
    },

    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'allow',

          policies: [
            {
              from: [{ element: { type: 'core' } }],
              disallow: [
                {
                  dependency: {
                    source: [
                      'react',
                      'react-dom',
                      'vue',
                      '@vue/**',
                      'preact',
                      'solid-js',
                      'solid-js/**',
                      'svelte',
                      'svelte/**',
                      'lit',
                      'lit/**',
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
