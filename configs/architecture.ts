import boundaries from 'eslint-plugin-boundaries'
import type { ESLintConfig } from './types'

const config = [
  {
    plugins: {
      boundaries,
    },

    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/core/**/*' },
        { type: 'react', pattern: 'packages/react/**/*' },
        { type: 'vue', pattern: 'packages/vue/**/*' },
        { type: 'preact', pattern: 'packages/preact/**/*' },
        { type: 'solid', pattern: 'packages/solid/**/*' },
        { type: 'tailwind', pattern: 'packages/tailwind/**/*' },
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
                { dependency: { source: ['react', 'react-dom', 'vue', '@vue/**', 'preact'] } },
              ],
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
