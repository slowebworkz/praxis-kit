import type { PolymorphicGenerics } from '@praxis-kit/core'
import type { BuiltChildrenEvaluator, WithChildRules } from '@praxis-kit/adapter-utils'
import type { FilterPredicate } from './primitives'
import type { TypedRuntime } from './runtime'
import type { SlotValidator } from '../slot'

export type { WithChildRules, BuiltChildrenEvaluator }

export type BuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  filterProps: FilterPredicate
  slotValidator: SlotValidator
}
