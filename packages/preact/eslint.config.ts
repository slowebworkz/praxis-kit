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
                '@praxis-ui/solid',
                '@praxis-ui/svelte',
                '@praxis-ui/docs',
              ],
              message: 'preact adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
