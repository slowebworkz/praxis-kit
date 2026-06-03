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
 * Options accepted by createContractComponent in the web adapter.
 *
 * Identical shape to LitFactoryOptions — a plain HTMLElement subclass with
 * no framework dependency. Light DOM only; Shadow DOM is out of scope.
 */
export type WebFactoryOptions<
  TDefault extends ElementType = ElementType,
  TProps extends AnyRecord = EmptyRecord,
  TVariants extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<TVariants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = FactoryOptions<TDefault, TProps, TVariants, TPreset, TPluginProps> & {
  readonly filterProps?: FilterPredicate
}
