import type {
  AnyClassPluginFactory,
  ElementType,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { UnknownProps } from './types/primitives'

// No `slotComponent` field: React delegates asChild rendering to an intermediate Slot component;
// Vue achieves the same via `cloneVNode` directly in the render layer, so no component is needed.
/**
 * Every generic parameter has a default (widened to that parameter's own *bound*, matching
 * a wide-bound, type-erased philosophy, not `FactoryOptions`'s own narrower `EmptyRecord`-style
 * defaults) so `VueFactoryOptions` can be used bare, as `createContractComponent`'s single
 * `C extends VueFactoryOptions` constraint — see `ReactFactoryOptions`'s identical fix for the
 * same reason.
 */
export type VueFactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends UnknownProps = UnknownProps,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = RecipeMap<Variants>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to
   * the DOM. Variant keys are always stripped automatically.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
