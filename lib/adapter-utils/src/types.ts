import type {
  ChildrenEvaluator,
  DefaultOf,
  EmptyRecord,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  VariantsOf,
  createPolymorphic,
} from '@praxis-kit/core'
import type { Simplify } from 'type-fest'
import type { SlotValidator } from './slot-validator'
import type { WithChildRules } from '@praxis-kit/shared/types'

export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean

export type { WithChildRules } from '@praxis-kit/shared/types'

// Absent entirely when no rules given — callers narrow with `'childrenEvaluator' in bundle`.
export type BuiltChildrenEvaluator<TOptions extends WithChildRules> = TOptions extends {
  enforcement: { children: readonly unknown[] }
}
  ? { childrenEvaluator: ChildrenEvaluator }
  : EmptyRecord

// Identical to the per-adapter TypedRuntime definitions — lifted here so adapters
// and new adapter authors can reference the canonical definition.
export type TypedRuntime<G extends PolymorphicGenerics> = ReturnType<
  typeof createPolymorphic<DefaultOf<G>, PropsOf<G>, VariantsOf<G>, PresetOf<G>>
>

// The common fields every adapter's BuiltRuntime must include. Framework-specific
// adapters extend this with additional fields (e.g. slotComponent, normalizeChildren).
// Simplify collapses the BuiltChildrenEvaluator intersection so IDE hover shows a
// plain object rather than an & chain.
export type BaseBuiltRuntime<
  G extends PolymorphicGenerics,
  TOptions extends WithChildRules = WithChildRules,
> = Simplify<
  BuiltChildrenEvaluator<TOptions> & {
    runtime: TypedRuntime<G>
    filterProps: FilterPredicate
    slotValidator: SlotValidator
  }
>
