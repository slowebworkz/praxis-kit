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
                '@praxis-kit/react',
                '@praxis-kit/vue',
                '@praxis-kit/preact',
                '@praxis-kit/solid',
                '@praxis-kit/svelte',
                '@praxis-kit/example-react',
                '@praxis-kit/example-vue',
              ],
              message: 'tailwind plugin must not import from adapters',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
