import unicorn from 'eslint-plugin-unicorn'
import type { ESLintConfig } from './types'

const FILES = ['**/*.{js,mjs,cjs,ts,mts,cts,tsx}']

const config = [
  {
    files: FILES,
    plugins: { unicorn },
    rules: {
      // Prefer for...of over .forEach — cleaner stack traces, easier to break/return.
      'unicorn/no-array-for-each': 'error',

      // Prefer includes() over indexOf() !== -1.
      'unicorn/prefer-includes': 'error',

      // Prefer String.startsWith / endsWith over slice/charAt comparisons.
      'unicorn/prefer-string-starts-ends-with': 'error',

      // Prefer Object.hasOwn() over hasOwnProperty.call().
      'unicorn/prefer-object-has-own': 'off', // not available in this plugin version

      // Prefer structuredClone() over JSON.parse(JSON.stringify()).
      'unicorn/prefer-structured-clone': 'error',

      // Prefer at() over [length - n] index patterns.
      'unicorn/prefer-at': 'error',

      // No useless undefined returns / assignments.
      // checkArguments: false — explicit undefined in call sites is semantically
      // distinct from omitting the argument (tests, overloads, optional params).
      'unicorn/no-useless-undefined': ['error', { checkArguments: false }],

      // Throw Error instances, not strings.
      'unicorn/throw-new-error': 'error',

      // Catch clause binding must be named `error` or `_error`.
      'unicorn/catch-error-name': ['error', { name: 'error' }],

      // Prefer node: protocol for Node builtins.
      'unicorn/prefer-node-protocol': 'error',

      // Avoid double Array.flat calls; use the depth argument instead.
      'unicorn/no-magic-array-flat-depth': 'error',
    },
  },
] satisfies ESLintConfig

export default config
