import type { CompoundVariant } from './compound-variants'
import type { ChildRuleInput } from './child-rule'
import type { AriaRule } from './aria-rule'
import type { AnyRecord, ClassName, ElementType, EmptyRecord, TagMap } from './primitives'
import type { StrictMode } from './strict-mode'
import type { PresetMap, VariantMap, VariantProps } from './variant'

/**
 * The normalized factory configuration produced by `resolveFactoryOptions`.
 *
 * Differs from `FactoryOptions` in two key ways:
 * - `defaultTag` is required and fully resolved (`NonNullable<TDefault> | string`)
 * - `strict` is required with its default already applied
 *
 * All other fields remain optional because the pipeline handles their absence
 * gracefully (empty base class, no tag-map, no variants, etc.). A future
 * normalization pass may promote all fields to required once defaults are
 * filled at resolve time rather than defensively throughout the pipeline.
 */
export type ResolvedFactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
> = {
  /** Resolved element type. `null` / `undefined` stripped; falls back to `string`. */
  readonly defaultTag: TDefault
  readonly baseClassName?: ClassName
  readonly defaultProps?: Partial<Props>
  readonly tagMap?: Readonly<TagMap>
  readonly presetMap?: TPreset
  readonly variants?: V
  readonly defaultVariants?: Partial<VariantProps<V>>
  readonly compoundVariants?: readonly CompoundVariant<V>[]
  readonly displayName?: string
  /** Always present — `resolveFactoryOptions` fills in `false` if omitted. */
  readonly strict: StrictMode
  /** Keys of the variant map. Always present; empty set when no variants defined. */
  readonly variantKeys: ReadonlySet<string>
  /** Rules that normalized children must satisfy. Absent when no rules were declared. */
  readonly childRules?: readonly ChildRuleInput[]
  /** Additional ARIA policy rules. Absent when none were declared. */
  readonly ariaRules?: readonly AriaRule[]
}
