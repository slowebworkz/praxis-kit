import type { ChildrenEvaluator, PolymorphicGenerics } from '@praxis-kit/core'
import type { FilterPredicate } from '@praxis-kit/adapter-utils'
import type { LooseRuntime, Runtime } from './runtime'

export type BuiltRuntime<G extends PolymorphicGenerics> = {
  readonly runtime: Runtime<G>
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}

// LooseBundle erases the generic parameter so applyHostState can accept any
// BuiltRuntime without knowing the specific PolymorphicGenerics type arguments.
// isLooseBundle() in create-contract-component.ts validates the shape at runtime
// before narrowing to this type — no blind casts needed.
export type LooseBundle = {
  readonly runtime: LooseRuntime
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}

// SSR registry entry — wraps a LooseBundle for lookup by component class in render-to-string.ts.
export type RegistryEntry = { bundle: LooseBundle }
