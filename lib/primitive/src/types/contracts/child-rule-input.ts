import type { Rule } from '../rule'
import type { CardinalityInput } from './cardinality'
import type { ChildRuleContext } from './child-rule-context'
import type { ChildRuleMatch } from './child-rule-match'
import type { ChildRulePosition } from './child-rule-position'

export type ChildRuleInput<T = unknown, U extends T = T> = {
  name: string
  match: ChildRuleMatch<T, U>
  /**
   * Either a static cardinality, or `dynamic((ctx) => ...)` to derive it from
   * the resolved tag/props (e.g. a different max depending on `as`). `match`
   * stays static-only — it's already a function, so a dynamic wrapper would
   * be indistinguishable from the predicate itself without one.
   */
  cardinality?: Rule<CardinalityInput, ChildRuleContext>
  position?: ChildRulePosition
  /**
   * Optional component-type reference for O(1) dispatch index.
   * When provided for every rule, the matcher reads child.type instead of
   * calling every match function on every child (O(n×m) → O(n+m)).
   */
  type?: unknown
}
