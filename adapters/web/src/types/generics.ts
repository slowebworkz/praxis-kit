import type { ElementType, PolymorphicGenerics, RecipeMap, VariantMap } from '@praxis-kit/core'
import type { AnyRecord } from '@praxis-kit/primitive'

export type RuntimeG<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
> = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
