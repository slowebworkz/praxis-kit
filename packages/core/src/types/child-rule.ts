import type { Merge } from 'type-fest'

/**
 * Author/input layer
 */

/** Type-guard predicate used to match a child against a rule. */
export type ChildRuleMatch<T, U extends T = T> = (child: T) => child is U

/** Where in the children array a rule's matches must appear. */
export type ChildRulePosition = 'first' | 'last' | 'any'

/**
 * Author-facing cardinality bounds. Both fields are optional:
 * omitting both produces an unbounded rule; omitting `max` with `position='first'|'last'`
 * implicitly sets `max=1` during normalization.
 */
export type CardinalityInput = {
  min?: number
  max?: number
}

export type ChildRuleInput<T = unknown, U extends T = T> = {
  name: string
  match: ChildRuleMatch<T, U>
  cardinality?: CardinalityInput
  position?: ChildRulePosition
}

/**
 * Normalized layer (strict + total)
 */

export type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }

export type NormalizedChildRule<T = unknown, U extends T = T> = Readonly<
  Merge<ChildRuleInput<T, U>, { cardinality: Cardinality; position: ChildRulePosition }>
>

/**
 * Matching layer
 */

export type MatchMatrix = Readonly<{
  childToRules: Readonly<{
    /** child position → rule indices that matched it */
    forward: ReadonlyMap<number, ReadonlySet<number>>
    /** rule index → child positions that matched it (pre-initialized for every rule) */
    reverse: ReadonlyMap<number, ReadonlySet<number>>
  }>
}>
