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
            'packages/codemod/tsup.config.ts',
            'packages/codemod/vitest.config.ts',
            'packages/ts-plugin/tsup.config.ts',
            'adapters/react/playwright-ct.config.ts',
            'adapters/react/playwright/index.tsx',
            'adapters/vue/playwright-ct.config.ts',
            'adapters/vue/playwright/index.ts',
            'playwright.workspace.ts',
            'vitest.workspace.ts',
            'lib/adapter-utils/vitest.config.ts',
            'lib/primitive/vitest.config.ts',
            'lib/*/eslint.config.ts',
            'examples/*/eslint.config.ts',
            'examples/*/vite.config.ts',
            'lib/tree-shaking-tests/scenarios/solid-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/vue-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/preact-minimal/*.ts',
            'lib/tree-shaking-tests/scenarios/svelte-minimal/*.ts',
          ],
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 71,
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
