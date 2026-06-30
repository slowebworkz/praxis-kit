import type { PolymorphicGenerics } from '@praxis-kit/core'
import type { BuiltChildrenEvaluator, WithChildRules } from '@praxis-kit/adapter-utils'
import type { SlotValidator } from '../slot'
import type { AnyVNode, FilterPredicate, SlotComponent } from './primitives'
import type { TypedRuntime } from './runtime'

export type { WithChildRules, BuiltChildrenEvaluator }

export type BuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  slotComponent: SlotComponent
  normalizeChildren: (children: unknown) => AnyVNode[]
  slotValidator: SlotValidator
  filterProps: FilterPredicate
}
