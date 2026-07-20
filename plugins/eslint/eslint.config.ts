import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base'
import ts from '../../configs/typescript'
import architecture from '../../configs/architecture'
import praxisPlugin from '../../configs/praxis-plugin'

const config = [
  ...praxisPlugin,
  ...base,
  ...ts,
  ...architecture,

  {
    files: ['src/**/*.ts'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@praxis-kit/react',
                '@praxis-kit/vue',
                '@praxis-kit/solid',
                '@praxis-kit/svelte',
                '@praxis-kit/preact',
                '@praxis-kit/core',
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
