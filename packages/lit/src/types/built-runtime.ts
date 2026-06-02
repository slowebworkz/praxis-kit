import type { ChildrenEvaluator, PolymorphicGenerics } from '@praxis-ui/core'
import type { FilterPredicate } from '@praxis-ui/adapter-utils'
import type { Runtime } from './runtime'

export type BuiltRuntime<G extends PolymorphicGenerics> = {
  readonly runtime: Runtime<G>
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}
