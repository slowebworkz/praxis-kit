import type { AnyRecord } from '../primitives/any-record'
import type { ElementType } from '../primitives/element-type'
import type { EmptyRecord } from '../primitives/empty-record'
import type { PresetMap } from './preset-map'
import type { VariantMap } from './variant-map'

export interface PolymorphicGenerics<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = AnyRecord,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>,
  TAllowed extends ElementType = ElementType,
> {
  default: TDefault
  props: Props
  variants: Variants
  preset: TPreset
  allowed: TAllowed
}

export type VariantsOf<T extends PolymorphicGenerics> = T['variants']
export type PresetOf<T extends PolymorphicGenerics> = T['preset']
export type AllowedOf<T extends PolymorphicGenerics> = T['allowed']
