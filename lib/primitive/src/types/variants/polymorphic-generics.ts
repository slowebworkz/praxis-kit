import type { AnyRecord, ElementType, EmptyRecord } from '../primitives'
import type { RecipeMap } from './recipe-map'
import type { VariantMap } from './variant-map'

export interface PolymorphicGenerics<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = AnyRecord,
  Variants extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants> = Readonly<EmptyRecord>,
  TAllowed extends ElementType = ElementType,
> {
  default: TDefault
  props: Props
  variants: Variants
  preset: TPreset
  allowed: TAllowed
}

export type VariantsOf<T extends PolymorphicGenerics> = T['variants']
export type RecipeOf<T extends PolymorphicGenerics> = T['preset']
export type AllowedOf<T extends PolymorphicGenerics> = T['allowed']
export type DefaultOf<T extends PolymorphicGenerics> = T['default']
export type PropsOf<T extends PolymorphicGenerics> = T['props']
