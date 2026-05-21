import type { ClassPluginFactory } from './class-plugin'
import type { CompoundVariant } from './compound-variants'
import type { ChildRuleInput } from './child-rule'
import type { AriaRule } from './aria-rule'
import type { AnyRecord, ClassName, ElementType, TagMap } from './primitives'
import type { StrictMode } from './strict-mode'
import type { PresetMap, VariantMap, VariantProps } from './variant'

/**
 * Configuration object accepted by `createPolymorphic`.
 *
 * Generic parameters flow left-to-right by dependency:
 * - `TDefault`     — the fallback element type, influences valid prop shapes
 * - `Props`        — the component's own prop surface
 * - `V`            — the variant dimension map, depends on props being settled
 * - `TPreset`      — named preset selections, must be valid variant subsets
 * - `TPluginProps` — extra props introduced by the class plugin (e.g. `LayoutProps`);
 *                    inferred from the `classPlugin` field — callers do not set this
 *
 * All fields are `readonly` — factory config is immutable after construction.
 */
export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = Record<never, never>,
  V extends Readonly<VariantMap> = Readonly<Record<never, never>>,
  TPreset extends PresetMap<V> = Readonly<Record<never, never>>,
  TPluginProps extends AnyRecord = Record<never, never>,
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

  /** Rules that normalized children must satisfy. Evaluated on every render when present. */
  readonly childRules?: readonly ChildRuleInput[]

  /**
   * Additional ARIA policy rules appended to the default pipeline. Each rule
   * receives the same `AriaContext` snapshot as built-in rules and may return
   * violations and auto-fixes. Runs only for tags that have an implicit ARIA role.
   */
  readonly ariaRules?: readonly AriaRule[]

  /**
   * Optional class pipeline plugin. When provided, the factory calls it with the resolved
   * options and uses the returned pipeline in place of the default `createClassPipeline`.
   * The plugin may also declare `ownedKeys` — prop keys it consumes — which adapters can
   * use to strip those keys before they reach the DOM or framework bindings.
   */
  readonly classPlugin?: ClassPluginFactory<TPluginProps>
}
