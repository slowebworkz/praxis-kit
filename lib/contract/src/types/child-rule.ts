import type { Merge, Tagged } from 'type-fest'

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

export type RuleIndex = Tagged<number, 'RuleIndex'>
export type ChildIndex = Tagged<number, 'ChildIndex'>

export type BiDirectionalMap<A, B> = Readonly<{
  forward: ReadonlyMap<A, ReadonlySet<B>>
  reverse: ReadonlyMap<B, ReadonlySet<A>>
}>

export type MatchMatrix = Readonly<{
  childToRules: BiDirectionalMap<ChildIndex, RuleIndex>
}>
