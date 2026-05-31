import type { ESLintConfig } from '../../configs/types'
import base from '../../configs/base'
import ts from '../../configs/typescript'
import praxisPlugin from '../../configs/praxis-plugin'

const config = [
  ...praxisPlugin,
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
                '@praxis-ui/example-react',
                '@praxis-ui/example-vue',
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
