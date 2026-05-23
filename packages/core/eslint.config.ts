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
                '@polymorphic-ui/tailwind',
                '@polymorphic-ui/docs',
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
