import type { ChildrenEvaluator, PolymorphicGenerics } from '@praxis-kit/core'
import type { FilterPredicate, SsrBundle } from '@praxis-kit/adapter-utils'
import type { Runtime } from './runtime'

export type BuiltRuntime<G extends PolymorphicGenerics> = {
  readonly runtime: Runtime<G>
  readonly filterProps: FilterPredicate
  readonly childrenEvaluator?: ChildrenEvaluator
}

// LooseBundle erases the generic parameter so resolveHostState/diffAndApplyAttributes
// (shared with the Web adapter, in @praxis-kit/adapter-utils) can accept any
// BuiltRuntime without knowing the specific PolymorphicGenerics type arguments.
// isLooseBundle()/toLooseBundle() (also shared) validate the shape at runtime
// before narrowing to this type — no blind casts needed. Aliased directly to the
// shared SsrBundle type rather than redeclaring an equivalent structural shape.
export type LooseBundle = SsrBundle

// SSR registry entry — wraps a LooseBundle for lookup by component class in render-to-string.ts.
export type RegistryEntry = { bundle: LooseBundle }
