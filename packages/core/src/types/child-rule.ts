export type {
  Cardinality,
  CardinalityInput,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  NormalizedChildRule,
} from '@praxis-kit/shared/types'

type IndexSet = ReadonlySet<number>
type IndexMap = ReadonlyMap<number, IndexSet>

type ChildRuleIndex = Record<'forward' | 'reverse', IndexMap>

/** Internal matching layer — not part of the public API surface. */
export type MatchMatrix = Readonly<{
  childToRules: ChildRuleIndex
}>
