import type { ChildrenEvaluator, PolymorphicGenerics, StrictMode } from '@praxis-ui/core'
import type { FilterPredicate } from '@praxis-ui/adapter-utils'
import type { LooseRuntime, Runtime } from './runtime'

export type BuiltRuntime<G extends PolymorphicGenerics> = {
  readonly runtime: Runtime<G>
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
  readonly strict: Exclude<StrictMode, undefined>
}

export type LooseBundle = {
  readonly runtime: LooseRuntime
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}
