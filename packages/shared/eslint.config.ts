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
                '@praxis-kit/react',
                '@praxis-kit/vue',
                '@praxis-kit/preact',
                '@praxis-kit/solid',
                '@praxis-kit/svelte',
                '@praxis-kit/lit',
                '@praxis-kit/web',
                '@praxis-kit/tailwind',
                '@praxis-kit/core',
              ],
              message: 'shared must not import from other praxis-kit packages',
            },
          ],
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
