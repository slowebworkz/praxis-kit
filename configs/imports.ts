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
    },
  },
] satisfies ESLintConfig

export default config
