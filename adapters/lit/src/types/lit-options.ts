import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PresetMap,
  VariantMap,
} from '@praxis-kit/core'
import type { FilterPredicate } from '@praxis-kit/adapter-utils'

/**
 * Options accepted by createContractComponent in the Lit adapter.
 *
 * Extends FactoryOptions with one Lit-specific field:
 * - filterProps: determines whether a prop should be omitted before it is
 *   reflected as a DOM attribute. Variant keys and plugin-owned keys are
 *   always omitted; this predicate extends that set.
 *
 * Note: this adapter targets Light DOM composition only. Shadow DOM slot
 * protocol is intentionally out of scope.
 */
export type LitFactoryOptions<
  TDefault extends ElementType = ElementType,
  TProps extends AnyRecord = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps> & {
  readonly filterProps?: FilterPredicate
}
