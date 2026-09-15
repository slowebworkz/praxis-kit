import type {
  AnyClassPluginFactory,
  ElementType as CoreElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { SlotComponent, UnknownProps } from './types/primitives'

/**
 * Every generic parameter has a default (widened to that parameter's own *bound*, matching
 * a wide-bound, type-erased philosophy, not `FactoryOptions`'s own narrower `EmptyRecord`-style
 * defaults) so `PreactFactoryOptions` can be used bare, as `createContractComponent`'s single
 * `C extends PreactFactoryOptions` constraint — see `ReactFactoryOptions`'s identical fix for the
 * same reason.
 */
export type PreactFactoryOptions<
  TDefault extends CoreElementType = CoreElementType,
  Props extends UnknownProps = UnknownProps,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
  /** Component used to render the asChild slot. Defaults to the built-in Slot. */
  slotComponent?: SlotComponent
  /**
   * Return true for any prop key that should be consumed but not forwarded to the DOM.
   * Receives `runtime.options.variantKeys` as a convenience if needed.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
