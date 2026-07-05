import type { PolymorphicGenerics } from '@praxis-kit/core'
import type { BuiltChildrenEvaluator, WithChildRules } from '@praxis-kit/adapter-utils'
import type { ReactElement } from 'react'
import type { SlotValidator } from '../slot'
import type { FilterPredicate, SlotComponent } from './primitives'
import type { TypedRuntime } from './runtime'

export type BuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  slotComponent: SlotComponent
  normalizeChildren: (children: unknown) => ReactElement[]
  slotValidator: SlotValidator
  filterProps: FilterPredicate
}
