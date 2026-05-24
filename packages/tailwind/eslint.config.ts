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
                '@polymorphic-ui/react',
                '@polymorphic-ui/vue',
                '@polymorphic-ui/preact',
                '@polymorphic-ui/solid',
                '@polymorphic-ui/svelte',
                '@polymorphic-ui/docs',
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
