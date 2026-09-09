/**
 * Surgical package-consumption scenario: `praxis-kit/utils` re-exports only `memoize` from
 * `@praxis-kit/primitive` — the smallest possible framework-neutral entry. See
 * contract-only/entry.ts for why this is a framework-neutral entry rather than an adapter-scoped
 * one.
 */
import { memoize } from 'praxis-kit/utils'

export { memoize }
