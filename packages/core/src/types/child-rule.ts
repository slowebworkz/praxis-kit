import type { Merge, Tagged } from 'type-fest'

/**
 * Author/input layer
 */

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

/**
 * Normalized layer (strict + total)
 */

export type Cardinality = { kind: 'bounded'; min: number; max: number } | { kind: 'unbounded' }

export type NormalizedChildRule<T = unknown, U extends T = T> = Readonly<
  Merge<ChildRuleInput<T, U>, { cardinality: Cardinality; position: ChildRulePosition }>
>

/**
 * Indexed layer (runtime optimization)
 */

export type RuleIndex = Tagged<number, 'RuleIndex'>
export type ChildIndex = Tagged<number, 'ChildIndex'>

/**
 * Matching layer (explicit graph model)
 */

export type BiDirectionalMap<A, B> = Readonly<{
  forward: ReadonlyMap<A, ReadonlySet<B>>
  reverse: ReadonlyMap<B, ReadonlySet<A>>
}>

export type MatchMatrix = Readonly<{
  childToRules: BiDirectionalMap<ChildIndex, RuleIndex>
}>

/**
 * Transform pipeline contracts
 */

export type Pipeline<A, B> = (input: A) => B

export type NormalizeChildRule = Pipeline<ChildRuleInput, NormalizedChildRule>

export type BuildGraph = (children: unknown[], rules: NormalizedChildRule[]) => MatchMatrix
