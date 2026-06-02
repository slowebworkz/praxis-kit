import type { ElementType, PolymorphicGenerics, PresetMap, VariantMap } from '@praxis-ui/core'

// Module-level generic alias — avoids repeating the full PolymorphicGenerics
// expression across normalizeOptions and buildRuntime.
export type RuntimeG<
  TDefault extends ElementType,
  Props extends Record<string, unknown>,
  Variants extends Readonly<VariantMap>,
  TPreset extends PresetMap<Variants>,
> = PolymorphicGenerics<TDefault, Props, Variants, TPreset>
