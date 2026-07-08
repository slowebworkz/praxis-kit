import type { ChildrenEvaluator, PolymorphicGenerics } from '@praxis-kit/core'
import type { FilterPredicate } from '@praxis-kit/adapter-utils'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { LooseRuntime, Runtime } from './runtime'

export type BuiltRuntime<G extends PolymorphicGenerics> = {
  readonly runtime: Runtime<G>
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
  readonly diagnostics: Diagnostics
}

export type LooseBundle = {
  readonly runtime: LooseRuntime
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}

// SSR registry entry — wraps a LooseBundle for lookup by component class in render-to-string.ts.
export type RegistryEntry = { bundle: LooseBundle }
