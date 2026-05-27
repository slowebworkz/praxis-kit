import type { ESLintConfig } from '../../configs/types'
import base from '../../configs/base.js'
import ts from '../../configs/typescript.js'

const config = [
  ...base,
  ...ts,

  {
    files: ['src/**/*.{ts,tsx}'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@praxis-ui/react',
                '@praxis-ui/vue',
                '@praxis-ui/preact',
                '@praxis-ui/solid',
                '@praxis-ui/svelte',
                '@praxis-ui/tailwind',
                '@praxis-ui/docs',
              ],

              message: 'core must not import from framework adapters',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
