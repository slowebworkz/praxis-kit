import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base.js'
import ts from '../../configs/typescript.js'

const config = [
  ...base,
  ...ts,

  {
    files: ['src/**/*.{ts,svelte}'],

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
                '@praxis-ui/docs',
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
