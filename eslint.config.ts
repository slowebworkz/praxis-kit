import type { ESLintConfig } from './configs/types'
import type { Linter } from 'eslint'
import type { ValueOf } from 'type-fest'
import base from './configs/base'
import ts from './configs/typescript'
import architecture from './configs/architecture'
import imports from './configs/imports'
import unicorn from './configs/unicorn'
import praxisPlugin from './plugins/eslint/src/index'

type EslintPlugin = ValueOf<NonNullable<Linter.Config['plugins']>>

// Ported from ../pk. `configs/architecture.ts`'s `boundaries/elements` patterns for packages that
// don't exist yet (lib/tailwind, plugins/{typescript,vite}, tooling/codemod) are inert until
// those dirs land.
const config = [
  ...base,
  ...ts,
  ...architecture,
  ...imports,
  ...unicorn,

  // Register the in-repo plugin globally so disable-directive validation can always resolve it.
  {
    plugins: { '@praxis-kit': praxisPlugin as unknown as EslintPlugin },
  },

  // Self-validate: run the plugin's own rules over all workspace component source.
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
