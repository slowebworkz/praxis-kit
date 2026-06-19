import type { AnyRecord, ClassName, EmptyRecord, TagMap } from '../primitives'
import type { ClassPluginFactory } from '../class'
import type { CompoundVariant } from '../variants/compound'
import type { DefaultVariants, RecipeMap, VariantMap } from '../variants'

export type StylingOptions<
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<V> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  readonly base?: ClassName
  readonly variants?: V
  readonly defaults?: Partial<DefaultVariants<V>>
  readonly compounds?: readonly CompoundVariant<V>[]
  readonly presets?: TPreset
  readonly tags?: Readonly<TagMap>
  readonly plugin?: ClassPluginFactory<TPluginProps>
  readonly precomputedClasses?: Readonly<Record<string, string>>
}
