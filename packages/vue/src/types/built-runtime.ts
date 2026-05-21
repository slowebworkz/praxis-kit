import type { AriaPolicyEngine, ChildrenEvaluator, PolymorphicGenerics } from '@polymorphic-ui/core'
import type { SlotValidator } from '../slot'
import type { FilterPredicate } from './primitives'
import type { TypedRuntime } from './runtime'

// Constraining TOptions to only the field we care about avoids deep VueFactoryOptions
// generic analysis (which exposes a VariantProps/exactOptionalPropertyTypes issue).
export type WithChildRules = { enforcement?: { children?: readonly unknown[] } }

// childrenEvaluator is absent entirely when no rules are given — not just optional —
// so callers can narrow with `'childrenEvaluator' in bundle` rather than `!= null`.
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
  slotValidator: SlotValidator
  ariaEngine: AriaPolicyEngine
  filterProps: FilterPredicate
}
