import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import type { ESLintConfig } from './types'

const FILES = ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}']

const config = [
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  {
    ...js.configs.recommended,
    files: FILES,
  },
  {
    ...eslintConfigPrettier,
    files: FILES,
  },
] satisfies ESLintConfig

export default config
