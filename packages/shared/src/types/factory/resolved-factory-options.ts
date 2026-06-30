import type { AnyRecord, ClassName, ElementType, EmptyRecord, TagMap } from '../primitives'
import type { AriaRule } from '../aria-rule'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { NormalizeFn } from './factory-options'
import type { PropNormalizer } from './prop-normalizer'
import type { ChildRuleInput } from '../contracts'
import type { CompoundVariant } from '../variants/compound'
import type { DefaultVariants, RecipeMap, VariantMap } from '../variants'

export type ResolvedFactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<V> = Readonly<EmptyRecord>,
> = {
  readonly defaultTag: TDefault
  readonly baseClassName?: ClassName
  readonly defaultProps?: Partial<Props>
  readonly tagMap?: Readonly<TagMap>
  readonly recipeMap?: TPreset
  readonly variants?: V
  readonly defaultVariants?: Partial<DefaultVariants<V>>
  readonly compoundVariants?: readonly CompoundVariant<V>[]
  readonly displayName?: string
  readonly diagnostics: Diagnostics
  readonly variantKeys: ReadonlySet<string>
  readonly normalizeFn?: NormalizeFn<Props>
  readonly htmlPropNormalizersFn?: (tag: unknown) => readonly PropNormalizer[] | undefined
  readonly childRules?: readonly ChildRuleInput[]
  readonly ariaRules?: readonly AriaRule[]
  readonly allowedAs?: readonly ElementType[]
  readonly precomputedClasses?: Readonly<Record<string, string>>
}
