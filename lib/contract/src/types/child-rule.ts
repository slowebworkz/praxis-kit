export type {
  Cardinality,
  CardinalityInput,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  NormalizedChildRule,
} from '@praxis-kit/primitive/types'

export type MatchMatrix = Readonly<{
  childToRules: Readonly<{
    forward: ReadonlyMap<number, ReadonlySet<number>>
    reverse: ReadonlyMap<number, ReadonlySet<number>>
  }>
}>
