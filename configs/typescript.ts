import { resolve } from 'node:path'
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
        tsconfigRootDir: resolve(import.meta.dirname, '..'),
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
          allowDefaultProject: ['eslint.config.ts'],
          defaultProject: 'tsconfig.eslint.json',
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
