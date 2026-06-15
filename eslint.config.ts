import type { ESLintConfig } from './configs/types'
import type { Linter } from 'eslint'
import base from './configs/base'
import ts from './configs/typescript'
import architecture from './configs/architecture'
import imports from './configs/imports'
import unicorn from './configs/unicorn'
import praxisPlugin from './packages/eslint-plugin/src/index'
import type { ValueOf } from 'type-fest'

type EslintPlugin = ValueOf<NonNullable<Linter.Config['plugins']>>

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
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
        projectService: {
          allowDefaultProject: [
            '*.ts',
            'scripts/*.ts',
            'configs/*.ts',
            'packages/*/eslint.config.ts',
            'adapters/*/eslint.config.ts',
            // codemod and ts-plugin have rootDir:src — tsup.config.ts and vitest.config.ts can't be in their tsconfig include
            'packages/codemod/tsup.config.ts',
            'packages/codemod/vitest.config.ts',
            'packages/ts-plugin/tsup.config.ts',
            // Playwright CT config and mount entry live outside the react package tsconfig include
            'adapters/react/playwright-ct.config.ts',
            'adapters/react/playwright/index.tsx',
            'adapters/vue/playwright-ct.config.ts',
            'adapters/vue/playwright/index.ts',
            'playwright.workspace.ts',
            'vitest.workspace.ts',
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
          // ~45 files: 2 root *.ts + 1 scripts + 9 configs + 11 pkg eslint configs + 7 adapter eslint configs + 2 lib vitest + 3 tsup/pw configs + 7 examples/*/eslint.config.ts + 5 examples/*/vite.config.ts + 2 non-React adapter scenarios + 2 workspace files
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 75,
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
      '@praxis-kit/no-redundant-role': 'warn',
      '@praxis-kit/valid-cardinality': 'error',
      '@praxis-kit/valid-children-config': 'error',
    },
  },
] satisfies ESLintConfig

export default config
