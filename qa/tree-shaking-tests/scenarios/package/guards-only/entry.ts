/**
 * Surgical package-consumption scenario: `praxis-kit/guards` re-exports only from
 * `@praxis-kit/primitive` (tag resolution, base type guards) — no `core`, no `diagnostics`, no
 * framework adapter. See contract-only/entry.ts for why this is a framework-neutral entry rather
 * than an adapter-scoped one.
 */
import { isTag } from 'praxis-kit/guards'

export { isTag }
