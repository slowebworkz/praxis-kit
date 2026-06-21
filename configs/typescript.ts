import tseslint from 'typescript-eslint'
import type { ESLintConfig } from './types'

const FILES = ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}']
const TS_FILES = ['**/*.{ts,mts,cts,tsx}']

const config = [
  ...tseslint.configs.recommended.map((cfg) => ({
    ...cfg,
    files: FILES,
  })),

  {
    files: FILES,
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: new URL('..', import.meta.url).pathname,
      },
    },
  },

  {
    files: FILES,

    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

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

  {
    files: TS_FILES,

    languageOptions: {
      parserOptions: {
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
            // Playwright CT config and mount entry live outside the react/vue package tsconfig include
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
            'examples/*/vite.config.ts',
            // PK2 workspace vitest configs live outside any tsconfig include
            'engine/*/vitest.config.ts',
            'domains/*/vitest.config.ts',
            'runtime/*/vitest.config.ts',
            'backends/*/vitest.config.ts',
            'plugins/*/vitest.config.ts',
            // framework-specific scenarios are excluded from the tree-shaking-tests tsconfig
            // (jsxImportSource:react conflicts with Solid/Vue/Preact/Svelte JSX/return types)
            'lib/tree-shaking-tests/scenarios/solid-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/vue-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/preact-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/svelte-minimal/*.ts',
          ],
          // ~45 files: prev ~38 + 7 PK2 vitest configs (engine/*/vitest, domains/*/vitest, runtime/*/vitest, backends/*/vitest, plugins/*/vitest)
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 85,
          defaultProject: './tsconfig.base.json',
        },
      },
    },

    rules: {
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: false,
        },
      ],
    },
  },
] satisfies ESLintConfig

export default config
