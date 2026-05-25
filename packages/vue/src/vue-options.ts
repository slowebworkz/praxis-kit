import type {
  AnyRecord,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  PresetMap,
  VariantMap,
} from '@polymorphic-ui/core'
import type { UnknownProps } from './types/primitives'

// No `slotComponent` field: React delegates asChild rendering to an intermediate Slot component;
// Vue achieves the same via `cloneVNode` directly in the render layer, so no component is needed.
export type VueFactoryOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to
   * the DOM. Variant keys are always stripped automatically.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
