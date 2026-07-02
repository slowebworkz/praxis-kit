import type { Linter } from 'eslint'
import praxisPlugin from '../plugins/eslint/src/index'

type EslintPlugin = NonNullable<Linter.Config['plugins']>[string]

const SOURCE_FILES = ['src/**/*.{ts,tsx}']

const config = [
  {
    plugins: { '@praxis-kit': praxisPlugin as unknown as EslintPlugin },
  },
  {
    files: SOURCE_FILES,
    rules: {
      '@praxis-kit/no-dead-compound': 'error',
      '@praxis-kit/no-enforcement-without-strict': 'error',
      '@praxis-kit/no-invalid-default': 'error',
      '@praxis-kit/no-invalid-html-nesting': 'error',
      '@praxis-kit/no-redundant-role': 'warn',
      '@praxis-kit/valid-cardinality': 'error',
      '@praxis-kit/valid-children-config': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          disallowTypeAnnotations: false,
          fixStyle: 'separate-type-imports',
        },
      ],
    },
  },
] satisfies Linter.Config[]

export default config
