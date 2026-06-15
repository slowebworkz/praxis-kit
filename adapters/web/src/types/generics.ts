import type { ElementType, PolymorphicGenerics, PresetMap, VariantMap } from '@praxis-kit/core'

export type RuntimeG<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
> = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
