export type {
  Cardinality,
  CardinalityInput,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  NormalizedChildRule,
} from '@praxis-ui/shared/types'

/** Internal matching layer — not part of the public API surface. */
export type MatchMatrix = Readonly<{
  childToRules: Readonly<{
    forward: ReadonlyMap<number, ReadonlySet<number>>
    reverse: ReadonlyMap<number, ReadonlySet<number>>
  }>
}>
