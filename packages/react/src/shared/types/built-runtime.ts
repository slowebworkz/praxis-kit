import type { AriaPolicyEngine, ChildrenEvaluator, PolymorphicGenerics } from '@polymorphic-ui/core'
import type { ReactElement } from 'react'
import type { SlotValidator } from '../slot'
import type { FilterPredicate, SlotComponent } from './primitives'
import type { TypedRuntime } from './runtime'

// Constraining TOptions to only the field we care about avoids deep ReactFactoryOptions checks
// (which expose a VariantProps/exactOptionalPropertyTypes issue).
export type WithChildRules = { enforcement?: { children?: readonly unknown[] } }

// Present only when options carry enforcement.children — absent entirely otherwise.
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
  slotComponent: SlotComponent
  normalizeChildren: (children: unknown) => ReactElement[]
  slotValidator: SlotValidator
  ariaEngine: AriaPolicyEngine
  filterProps: FilterPredicate
}
