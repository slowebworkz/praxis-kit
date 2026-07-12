import type { Cardinality, ChildRulePosition } from '@praxis-kit/core'

/**
 * One enforcement.children rule whose cardinality is statically extractable
 * from the factory call AST. The `Cardinality` discriminated union matches the
 * shape used by the runtime `ChildrenEvaluator` — unbounded rules contribute
 * Infinity to `totalMax`.
 */
export type StaticBound = {
  cardinality: Cardinality
  position: ChildRulePosition
}

/**
 * A component definition collected from a createPolymorphicComponent /
 * createContractComponent call whose enforcement.children array contains at
 * least one rule with a statically-extractable cardinality.
 */
export type ComponentConstraint = {
  /** Variable name the component is bound to (e.g. "Button"). */
  name: string
  /** One entry per ChildRuleInput whose cardinality is a literal object. */
  rules: StaticBound[]
  /** Sum of all rule.cardinality.min values. */
  totalMin: number
  /** Sum of all rule.cardinality.max values; Infinity if any rule is unbounded. */
  totalMax: number
  /** The default HTML tag declared in the factory call (`tag: 'button'`), if statically present. */
  defaultTag?: string
  /** True when `enforcement.aria` is a non-empty array literal in the factory call. */
  hasAriaRules: boolean
  /**
   * True when `enforcement.exclusiveChildren` is statically `true` in the factory call.
   * Only when this is true does an "over the max" child count constitute a real
   * violation — enforcement.children is open-by-default, so extra unmatched children
   * are otherwise allowed regardless of `totalMax`.
   */
  exclusiveChildren: boolean
}

/**
 * A statically-analyzable child count range. For fully static children
 * (no JSX expressions) min === max === exact count. For partially-dynamic
 * patterns (conditionals, &&, array literals) the range bounds the possible
 * count. `undefined` means the count is unknowable (e.g. `.map()` calls,
 * variable references, spread children).
 */
export type ChildCount = {
  readonly min: number
  readonly max: number
}

/**
 * A JSX usage site collected for deferred cross-file cardinality validation.
 * Stored during `transform` and validated in `buildEnd` once the full
 * constraint registry is populated.
 */
export type PendingUsage = {
  tagName: string
  /**
   * Statically-analyzable child count range. `undefined` when the count is
   * completely unknowable (e.g. `.map()`, variable reference, spread children).
   * A range where `min === max` represents an exact static count.
   */
  count: ChildCount | undefined
  /** 1-based line number. */
  line: number
  /** 1-based column number. */
  col: number
}
