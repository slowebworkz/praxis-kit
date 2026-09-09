import type { Merge } from 'type-fest'
import type { Cardinality } from './cardinality'
import type { ChildRuleInput } from './child-rule-input'
import type { ChildRulePosition } from './child-rule-position'

export type NormalizedChildRule<T = unknown, U extends T = T> = Readonly<
  Merge<ChildRuleInput<T, U>, { cardinality: Cardinality; position: ChildRulePosition }>
>
