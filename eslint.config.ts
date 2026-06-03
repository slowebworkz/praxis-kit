import type { ESLintConfig } from './configs/types'
import type { Linter } from 'eslint'
import base from './configs/base'
import ts from './configs/typescript'
import architecture from './configs/architecture'
import imports from './configs/imports'
import unicorn from './configs/unicorn'
import praxisPlugin from './packages/eslint-plugin/src/index'

type EslintPlugin = NonNullable<Linter.Config['plugins']>[string]

const TS_FILES = ['**/*.{ts,mts,cts,tsx}']

const config = [
  ...base,
  ...ts,

  // Root-level files (scripts/, configs/, per-package eslint.config.ts) are
  // not included by any package tsconfig — broaden allowDefaultProject so the
  // project service can parse them.
  {
    files: TS_FILES,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: [
            '*.ts',
            'scripts/*.ts',
            'configs/*.ts',
            'packages/*/eslint.config.ts',
            // codemod and ts-plugin have rootDir:src — tsup.config.ts can't be in their tsconfig include
            'packages/codemod/tsup.config.ts',
            'packages/ts-plugin/tsup.config.ts',
            // remaining tsup.config.ts files are included in each package's tsconfig — removed from here
            // lib/contract and lib/styling include vitest.config.ts in their tsconfig — listed explicitly
            'lib/adapter-utils/vitest.config.ts',
            'lib/primitive/vitest.config.ts',
            'lib/*/eslint.config.ts',
            'examples/*/eslint.config.ts',
            'examples/*/vite.config.ts',
            // framework-specific scenarios are excluded from the tree-shaking-tests tsconfig
            // (jsxImportSource:react conflicts with Solid/Vue/Preact/Svelte JSX/return types)
            'lib/tree-shaking-tests/scenarios/solid-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/vue-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/preact-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/svelte-minimal/*.ts',
          ],
          // ~32 files: 2 root *.ts + 1 scripts + 9 configs + 10 per-package eslint configs (incl. lit) + 2 lib vitest + 2 tsup (codemod/ts-plugin) + 6 examples/*/eslint.config.ts + 5 examples/*/vite.config.ts + 2 non-React adapter scenarios
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 50,
          defaultProject: './tsconfig.base.json',
        },
      },
    },
  },

  ...architecture,
  ...imports,
  ...unicorn,

  // Register plugin globally so disable-directive validation can always find it.
  {
    plugins: { '@praxis-ui': praxisPlugin as unknown as EslintPlugin },
  },

  // Self-validate: run the plugin's own rules on all workspace source.
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'examples/*/src/**/*.{ts,tsx}'],
    rules: {
      '@praxis-ui/no-dead-compound': 'error',
      '@praxis-ui/no-enforcement-without-strict': 'error',
      '@praxis-ui/no-invalid-default': 'error',
      '@praxis-ui/no-redundant-role': 'warn',
      '@praxis-ui/valid-cardinality': 'error',
      '@praxis-ui/valid-children-config': 'error',
    },
  },
] satisfies ESLintConfig

export default config
