import type { PolymorphicGenerics } from '@polymorphic-ui/core'
import type { BuiltChildrenEvaluator, WithChildRules } from '@polymorphic-ui/adapter-utils'
import type { FilterPredicate } from './primitives'
import type { TypedRuntime } from './runtime'
import type { SlotValidator } from '../slot/slot-validator'

export type { WithChildRules, BuiltChildrenEvaluator }

export type BuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  filterProps: FilterPredicate
  slotValidator: SlotValidator
}
