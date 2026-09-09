import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { ChildViolationKind } from '@praxis-kit/primitive'

export type {
  Cardinality,
  CardinalityInput,
  ChildRuleContext,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  ChildViolationKind,
  NormalizedChildRule,
} from '@praxis-kit/primitive'

export type ChildViolation = {
  kind: ChildViolationKind
  message: string
  diagnostic: DiagnosticInput
  /** Present for cardinality and position violations. */
  ruleName?: string
  /** Present for unexpected and ambiguous violations. */
  childIndex?: number
}

export type MatchMatrix = Readonly<{
  childToRules: Readonly<{
    forward: ReadonlyMap<number, ReadonlySet<number>>
    reverse: ReadonlyMap<number, ReadonlySet<number>>
  }>
}>
