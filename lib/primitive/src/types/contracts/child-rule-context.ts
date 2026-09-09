import type { AnyRecord } from '../primitives'

/**
 * Resolved per-instance state available to a dynamic (`dynamic(...)`) child
 * rule field — the same tag/props every adapter already computes before
 * evaluating children, exposed so a rule can vary by them (e.g. cardinality
 * that depends on the resolved `as` tag).
 */
export type ChildRuleContext = {
  readonly tag: unknown
  readonly props: Readonly<AnyRecord>
}
