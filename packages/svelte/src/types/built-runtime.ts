import type { AriaPolicyEngine, ChildrenEvaluator, PolymorphicGenerics } from '@polymorphic-ui/core'
import type { FilterPredicate } from './primitives'
import type { Runtime, TypedRuntime } from './runtime'

export type WithChildRules = { enforcement?: { children?: readonly unknown[] } }

export type BuiltChildrenEvaluator<TOptions extends WithChildRules> = TOptions extends {
  enforcement: { children: readonly unknown[] }
}
  ? { childrenEvaluator: ChildrenEvaluator }
  : Record<never, never>

export type BuiltRuntime<
  G extends PolymorphicGenerics = PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  ariaEngine: AriaPolicyEngine
  filterProps: FilterPredicate
}

// Structural alias used when generic precision is not needed (e.g. as a prop type).
// Uses the structural Runtime supertype rather than TypedRuntime<any> — TypedRuntime<any>
// expands to require classPlugin (from the tailwind overload), breaking assignability.
// All BuiltRuntime<G, TOptions> variants satisfy this shape.
export type AnyBuiltRuntime = {
  runtime: Runtime
  ariaEngine: AriaPolicyEngine
  filterProps: FilterPredicate
  childrenEvaluator?: ChildrenEvaluator
}
