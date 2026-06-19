export const SPECIAL_CASES: Readonly<Record<string, string>> = {
  '@praxis-kit/eslint-plugin': 'praxis-kit/eslint',
}

// Matches both @praxis-kit/* and praxis-kit/* so rename works before or after path migration.
export const PRAXIS_PACKAGE = /^(?:@praxis-kit|praxis-kit)\//
