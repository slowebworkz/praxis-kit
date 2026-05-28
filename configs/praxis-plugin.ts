import type { Linter } from 'eslint'
import praxisPlugin from '../packages/eslint-plugin/src/index'

type EslintPlugin = NonNullable<Linter.Config['plugins']>[string]

const SOURCE_FILES = ['src/**/*.{ts,tsx}']

const config = [
  {
    plugins: { '@praxis-ui': praxisPlugin as unknown as EslintPlugin },
  },
  {
    files: SOURCE_FILES,
    rules: {
      '@praxis-ui/no-dead-compound': 'error',
      '@praxis-ui/no-enforcement-without-strict': 'error',
      '@praxis-ui/no-invalid-default': 'error',
      '@praxis-ui/no-redundant-role': 'warn',
      '@praxis-ui/valid-cardinality': 'error',
      '@praxis-ui/valid-children-config': 'error',
    },
  },
] satisfies Linter.Config[]

export default config
