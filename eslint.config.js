import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import boundaries from 'eslint-plugin-boundaries'
import tseslint from 'typescript-eslint'

const FILES = ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}']
const TS_FILES = ['**/*.{ts,mts,cts,tsx}']

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  { ...js.configs.recommended, files: FILES },
  { ...eslintConfigPrettier, files: FILES },
  ...tseslint.configs.recommended.map((cfg) => ({ ...cfg, files: FILES })),
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
          allowDefaultProject: ['*.ts', 'scripts/*.ts'],
          defaultProject: './tsconfig.base.json',
        },
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-exports': [
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: false },
      ],
    },
  },

  // ── Architecture boundary enforcement ─────────────────────────────────────
  //
  // Two complementary layers:
  //   1. eslint-plugin-boundaries/external  — prevents framework packages leaking
  //      into elements where they don't belong (runs without an import resolver)
  //   2. no-restricted-imports per package  — enforces cross-package dep direction
  //      (reliable regardless of resolver setup)
  //
  // boundaries/element-types (cross-workspace import direction) is deferred until
  // an import resolver (eslint-import-resolver-typescript) is wired up.
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/core/**/*' },
        { type: 'react', pattern: 'packages/react/**/*' },
        { type: 'vue', pattern: 'packages/vue/**/*' },
        { type: 'preact', pattern: 'packages/preact/**/*' },
        { type: 'tailwind', pattern: 'packages/tailwind/**/*' },
        { type: 'docs', pattern: 'packages/docs/**/*' },
        { type: 'scripts', pattern: 'scripts/**/*' },
      ],
      'boundaries/ignore': ['**/dist/**', '**/node_modules/**'],
    },
    rules: {
      'boundaries/external': [
        'error',
        {
          default: 'allow',
          rules: [
            { from: ['core'], disallow: ['react', 'react-dom', 'vue', '@vue/**', 'preact'] },
            { from: ['react'], disallow: ['vue', '@vue/**', 'preact'] },
            { from: ['vue'], disallow: ['react', 'react-dom', 'preact'] },
            { from: ['preact'], disallow: ['react', 'react-dom', 'vue', '@vue/**'] },
            { from: ['tailwind'], disallow: ['react', 'react-dom', 'vue', '@vue/**', 'preact'] },
          ],
        },
      ],
    },
  },

  // core: no imports from other internal packages
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@polymorphic-ui/react',
                '@polymorphic-ui/vue',
                '@polymorphic-ui/tailwind',
                '@polymorphic-ui/docs',
              ],
              message: 'core must not import from other internal packages',
            },
          ],
        },
      ],
    },
  },
  // react adapter: no other adapters
  {
    files: ['packages/react/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@polymorphic-ui/vue', '@polymorphic-ui/docs'],
              message: 'react adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
  // preact adapter: no other adapters
  {
    files: ['packages/preact/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@polymorphic-ui/react', '@polymorphic-ui/vue', '@polymorphic-ui/docs'],
              message: 'preact adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
  // vue adapter: no other adapters
  {
    files: ['packages/vue/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@polymorphic-ui/react', '@polymorphic-ui/docs'],
              message: 'vue adapter must not import from other adapters',
            },
          ],
        },
      ],
    },
  },
  // tailwind plugin: only core
  {
    files: ['packages/tailwind/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@polymorphic-ui/react', '@polymorphic-ui/vue', '@polymorphic-ui/docs'],
              message: 'tailwind plugin must not import from adapters',
            },
          ],
        },
      ],
    },
  },
]
