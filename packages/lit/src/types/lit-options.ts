import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PresetMap,
  VariantMap,
} from '@praxis-ui/core'
import type { FilterPredicate } from '@praxis-ui/adapter-utils'

/**
 * Options accepted by createContractComponent in the Lit adapter.
 *
 * Extends FactoryOptions with Lit-specific fields:
 * - filterProps: additional prop keys to strip before reflecting to DOM attributes
 *
 * Note: asChild / slot composition in Lit uses Light DOM — the rendered element
 * is a standard HTMLElement with praxis-ui's prop pipeline applied. Shadow DOM
 * slot protocol is intentionally out of scope for this adapter.
 */
export type LitFactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = FactoryOptions<TDefault, Props, V, TPreset, TPluginProps> & {
  /**
   * Additional predicate for stripping props before they are reflected as
   * DOM attributes. Variant keys and plugin-owned keys are always stripped.
   */
  readonly filterProps?: FilterPredicate
}
