import importX from 'eslint-plugin-import-x'
import type { ESLintConfig } from './types'

const TS_FILES = ['**/*.{ts,mts,cts,tsx}']

const config = [
  {
    files: TS_FILES,
    plugins: { 'import-x': importX },
    rules: {
      // Imports must come before any non-import code.
      'import-x/first': 'error',

      // No duplicate import statements from the same module.
      'import-x/no-duplicates': 'error',

      // Type imports must be on their own `import type` statement — never inline
      // inside a mixed value+type import. Enforces the pattern documented in CLAUDE.md.
      'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],

      // Catches real (value) import cycles at lint time — including a file importing
      // its own package's published name instead of a relative path, which is how
      // several accidental cross-package cycles slipped in undetected. Type-only
      // (`import type`) edges are excluded automatically by this rule. maxDepth bounds
      // graph traversal — unbounded (the default) blows the heap on this monorepo's
      // size; every real cycle found here was within a handful of hops.
      'import-x/no-cycle': ['error', { maxDepth: 6 }],
    },
  },
] satisfies ESLintConfig

export default config
