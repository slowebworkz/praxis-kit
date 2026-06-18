import type { AnyRecord, ClassName, ElementType, EmptyRecord, TagMap } from '../primitives'
import type { StrictMode } from '../config'
import type { AriaRule } from '../aria-rule'
import type { NormalizeFn } from './factory-options'
import type { PropNormalizer } from './prop-normalizer'
import type { ChildRuleInput } from '../contracts'
import type { CompoundVariant } from '../variants/compound'
import type { PresetMap, VariantMap, VariantProps } from '../variants'

export type ResolvedFactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
> = {
  readonly defaultTag: TDefault
  readonly baseClassName?: ClassName
  readonly defaultProps?: Partial<Props>
  readonly tagMap?: Readonly<TagMap>
  readonly presetMap?: TPreset
  readonly variants?: V
  readonly defaultVariants?: Partial<VariantProps<V>>
  readonly compoundVariants?: readonly CompoundVariant<V>[]
  readonly displayName?: string
  readonly strict: StrictMode
  readonly variantKeys: ReadonlySet<string>
  readonly normalizeFn?: NormalizeFn<Props>
  readonly htmlPropNormalizersFn?: (tag: unknown) => readonly PropNormalizer[] | undefined
  readonly childRules?: readonly ChildRuleInput[]
  readonly ariaRules?: readonly AriaRule[]
  readonly allowedAs?: readonly ElementType[]
  readonly precomputedClasses?: Readonly<Record<string, string>>
}
