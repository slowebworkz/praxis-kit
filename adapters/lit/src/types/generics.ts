import type { ElementType, PolymorphicGenerics, RecipeMap, VariantMap } from '@praxis-kit/core'
import type { AnyRecord } from '@praxis-kit/primitive'

// Module-level generic alias — avoids repeating the full PolymorphicGenerics
// expression across normalizeOptions and buildRuntime.
export type RuntimeG<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends RecipeMap<Variants>,
> = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
