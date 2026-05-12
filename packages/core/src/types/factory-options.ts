import type { CompoundVariant } from './compound-variants'
import type { AnyRecord, ClassName, ElementType, TagMap } from './primitives'
import type { StrictMode } from './strict-mode'
import type { VariantMap, VariantProps } from './variant'

/**
 * Configuration object accepted by `createPolymorphic`.
 *
 * Generic parameters flow left-to-right by dependency:
 * - `TDefault` — the fallback element type, influences valid prop shapes
 * - `Props`    — the component's own prop surface
 * - `V`        — the variant dimension map, depends on props being settled
 * - `TPreset`  — named preset selections, must be valid variant subsets
 *
 * All fields are `readonly` — factory config is immutable after construction.
 */
export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = Record<never, never>,
  V extends Readonly<VariantMap> = Readonly<Record<never, never>>,
  TPreset extends Readonly<Record<string, Partial<VariantProps<V>>>> = Readonly<
    Record<never, never>
  >,
> = {
  /** The element type rendered when no `as` prop is supplied. Defaults to `'div'`. */
  readonly defaultTag?: TDefault

  /** CSS class applied on every render, before variant and tag-map classes. */
  readonly baseClassName?: ClassName

  /** Prop values merged in before caller-supplied props. Caller wins on conflict. */
  readonly defaultProps?: Partial<Props>

  /**
   * Per-tag CSS class overrides. When the rendered tag matches a key, its
   * mapped class is appended after the base class. Skipped when a `variantKey`
   * is active (preset rendering bypasses tag-map resolution).
   */
  readonly tagMap?: Readonly<TagMap>

  /**
   * Named bundles of variant selections, activated by `variantKey` at render time.
   * Keys become the valid `variantKey` literal union on `PolymorphicRuntime`.
   */
  readonly presetMap?: TPreset

  /** Variant dimension map — the shape passed to the underlying `cva()` helper. */
  readonly variants?: V

  /** Fallback variant state for each dimension when no prop is explicitly passed. */
  readonly defaultVariants?: Partial<VariantProps<V>>

  /**
   * Conditional class rules that activate when all specified variant conditions
   * are simultaneously satisfied.
   */
  readonly compoundVariants?: readonly CompoundVariant<V>[]

  /** Identifier used in dev tooling and validation error messages. */
  readonly displayName?: string

  /** Controls how structural validation errors (ARIA, children, props) are surfaced. */
  readonly strict?: StrictMode
}
