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
                '@praxis-kit/preact',
                '@praxis-kit/solid',
                '@praxis-kit/example-react',
                '@praxis-kit/example-vue',
              ],
              message: 'svelte adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
