import type { AriaPolicyEngine, ChildrenEvaluator, PolymorphicGenerics } from '@polymorphic-ui/core'
import type { FilterPredicate } from './primitives'
import type { TypedRuntime } from './runtime'

export type WithChildRules = { enforcement?: { children?: readonly unknown[] } }

export type BuiltChildrenEvaluator<TOptions extends WithChildRules> = TOptions extends {
  enforcement: { children: readonly unknown[] }
}
  ? { childrenEvaluator: ChildrenEvaluator }
  : Record<never, never>

export type BuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = BuiltChildrenEvaluator<TOptions> & {
  runtime: TypedRuntime<G>
  ariaEngine: AriaPolicyEngine
  filterProps: FilterPredicate
}
