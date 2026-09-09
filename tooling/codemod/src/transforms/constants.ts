// Record<string, string>, not StringMap from @praxis-kit/primitive — this package's tsconfig
// uses NodeNext module resolution (a distinct, standalone compilation setup, not the bundler-mode
// tsconfig.base.json every other package extends), which cannot resolve @praxis-kit/primitive's
// own extensionless internal imports at all. See DECISIONS.md.
export const SPECIAL_CASES: Readonly<Record<string, string>> = {
  '@praxis-kit/eslint-plugin': 'praxis-kit/eslint',
}

// Matches both @praxis-kit/* and praxis-kit/* so rename works before or after path migration.
export const PRAXIS_PACKAGE = /^(?:@praxis-kit|praxis-kit)\//
