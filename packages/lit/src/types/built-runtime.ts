import type { ChildrenEvaluator, PolymorphicGenerics } from '@praxis-ui/core'
import type { FilterPredicate } from '@praxis-ui/adapter-utils'
import type { LooseRuntime, Runtime } from './runtime'

export type BuiltRuntime<G extends PolymorphicGenerics> = {
  readonly runtime: Runtime<G>
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}

// LooseBundle erases the generic parameter so applyHostState can accept any
// BuiltRuntime without knowing the specific PolymorphicGenerics type arguments.
// The double cast (bundle as unknown as LooseBundle) is the intended escape hatch —
// see ROADMAP for a proposed RuntimeContract interface that would eliminate it.
export type LooseBundle = {
  readonly runtime: LooseRuntime
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}
