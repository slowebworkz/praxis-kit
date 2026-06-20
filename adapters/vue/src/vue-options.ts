import type {
  AnyRecord,
  ClassPluginFactory,
  ElementType,
  EmptyRecord,
  FactoryOptions,
  RecipeMap,
  VariantMap,
} from '@praxis-kit/core'
import type { UnknownProps } from './types/primitives'

// No `slotComponent` field: React delegates asChild rendering to an intermediate Slot component;
// Vue achieves the same via `cloneVNode` directly in the render layer, so no component is needed.
export type VueFactoryOptions<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TPlugin extends ClassPluginFactory<AnyRecord> | undefined =
    | ClassPluginFactory<AnyRecord>
    | undefined,
> = FactoryOptions<TDefault, Props, Variants, TPreset, TPlugin> & {
  /**
   * Return true for any prop key that should be consumed but not forwarded to
   * the DOM. Variant keys are always stripped automatically.
   */
  filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean
}
