import type { Merge } from 'type-fest'

export type ChildRuleMatch<T, U extends T = T> = (child: T) => child is U

export type ChildRulePosition = 'first' | 'last' | 'any'

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

export type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }

export type NormalizedChildRule<T = unknown, U extends T = T> = Readonly<
  Merge<ChildRuleInput<T, U>, { cardinality: Cardinality; position: ChildRulePosition }>
>

export type MatchMatrix = Readonly<{
  childToRules: Readonly<{
    /** child position → rule indices that matched it */
    forward: ReadonlyMap<number, ReadonlySet<number>>
    /** rule index → child positions that matched it (pre-initialized for every rule) */
    reverse: ReadonlyMap<number, ReadonlySet<number>>
  }>
}>
