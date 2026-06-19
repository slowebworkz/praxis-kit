import type { ElementType, PolymorphicGenerics, RecipeMap, VariantMap } from '@praxis-kit/core'

export type RuntimeG<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
> = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
