/**
 * Full-entry composition scenario for `@praxis-kit/react` — every export the entry has, not one
 * symbol (see scripts/analyze.ts for why full-entry rather than tree-shaking-tests' minimal-usage
 * style). Answers "what does the whole React adapter actually cost, source-attributed by package."
 */
export * from '@praxis-kit/react'
