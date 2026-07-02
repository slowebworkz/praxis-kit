import type { ESLintConfig } from './configs/types'
import type { Linter } from 'eslint'
import base from './configs/base'
import ts from './configs/typescript'
import architecture from './configs/architecture'
import imports from './configs/imports'
import unicorn from './configs/unicorn'
import praxisPlugin from './plugins/eslint/src/index'
import type { ValueOf } from 'type-fest'

type EslintPlugin = ValueOf<NonNullable<Linter.Config['plugins']>>

const config = [
  ...base,
  ...ts,

  ...architecture,
  ...imports,
  ...unicorn,

  // Register plugin globally so disable-directive validation can always find it.
  {
    plugins: { '@praxis-kit': praxisPlugin as unknown as EslintPlugin },
  },

  // Self-validate: run the plugin's own rules on all workspace source.
  {
    files: [
      'packages/*/src/**/*.{ts,tsx}',
      'adapters/*/src/**/*.{ts,tsx}',
      'examples/*/src/**/*.{ts,tsx}',
    ],
    rules: {
      '@praxis-kit/no-dead-compound': 'error',
      '@praxis-kit/no-enforcement-without-strict': 'error',
      '@praxis-kit/no-invalid-default': 'error',
      '@praxis-kit/no-invalid-html-nesting': 'error',
      '@praxis-kit/no-redundant-role': 'warn',
      '@praxis-kit/valid-cardinality': 'error',
      '@praxis-kit/valid-children-config': 'error',
    },
  },
] satisfies ESLintConfig

export default config
