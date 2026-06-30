import type { CardinalityInput } from './cardinality'
import type { ChildRuleMatch } from './child-rule-match'
import type { ChildRulePosition } from './child-rule-position'

export type ChildRuleInput<T = unknown, U extends T = T> = {
  name: string
  match: ChildRuleMatch<T, U>
  cardinality?: CardinalityInput
  position?: ChildRulePosition
  /**
   * Optional component-type reference for O(1) dispatch index.
   * When provided for every rule, the matcher reads child.type instead of
   * calling every match function on every child (O(n×m) → O(n+m)).
   */
  type?: unknown
}
