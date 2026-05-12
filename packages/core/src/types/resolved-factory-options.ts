import type { CompoundVariant } from './compound-variants'
import type { AnyRecord, ClassName, ElementType, TagMap } from './primitives'
import type { StrictMode } from './strict-mode'
import type { VariantMap, VariantProps } from './variant'

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
  Props extends AnyRecord = Record<never, never>,
  V extends Readonly<VariantMap> = Readonly<Record<never, never>>,
  TPreset extends Readonly<Record<string, Partial<VariantProps<V>>>> = Readonly<
    Record<never, never>
  >,
> = {
  /** Resolved element type. `null` / `undefined` stripped; falls back to `string`. */
  readonly defaultTag: NonNullable<TDefault> | string
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
}
