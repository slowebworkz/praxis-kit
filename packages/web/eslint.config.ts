import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base'
import ts from '../../configs/typescript'
import praxisPlugin from '../../configs/praxis-plugin'

const config = [
  ...praxisPlugin,
  ...base,
  ...ts,

  {
    files: ['src/**/*.ts'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@praxis-ui/react',
                '@praxis-ui/preact',
                '@praxis-ui/solid',
                '@praxis-ui/svelte',
                '@praxis-ui/vue',
                '@praxis-ui/lit',
              ],
              message: 'web adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
