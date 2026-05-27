import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base.js'
import ts from '../../configs/typescript.js'

const config = [
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
                '@praxis-ui/vue',
                '@praxis-ui/solid',
                '@praxis-ui/svelte',
                '@praxis-ui/preact',
                '@praxis-ui/core',
              ],
              message: 'eslint-plugin must not import from framework packages',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
