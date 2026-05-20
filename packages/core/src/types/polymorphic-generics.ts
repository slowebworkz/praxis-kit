import type { AnyRecord, ElementType } from './primitives'
import type { VariantMap, PresetMap } from './variant'

export interface PolymorphicGenerics<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = AnyRecord,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<Record<never, never>>,
> {
  default: TDefault
  props: Props
  variants: Variants
  preset: TPreset
}

export type DefaultOf<T extends PolymorphicGenerics> = T['default']
export type PropsOf<T extends PolymorphicGenerics> = T['props']
export type VariantsOf<T extends PolymorphicGenerics> = T['variants']
export type PresetOf<T extends PolymorphicGenerics> = T['preset']
