import type { ClassPluginFactory } from './class-plugin'
import type { CompoundVariant } from './compound-variants'
import type { ChildRuleInput } from './child-rule'
import type { AriaRule } from './aria-rule'
import type { AnyRecord, ClassName, ElementType, EmptyRecord, TagMap } from './primitives'
import type { StrictMode } from './strict-mode'
import type { PresetMap, VariantMap, VariantProps } from './variant'

/**
 * Class composition configuration — all fields that feed into the class pipeline.
 *
 * Generic parameters:
 * - `V`            — variant dimension map
 * - `TPreset`      — named preset selections
 * - `TPluginProps` — extra props contributed by the class plugin (e.g. `LayoutProps`);
 *                    inferred from `plugin` — callers do not set this explicitly
 */
export type StylingOptions<
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  /** CSS class applied on every render, before variant and tag-map classes. */
  readonly base?: ClassName

  /** Variant dimension map — the shape passed to the underlying `cva()` helper. */
  readonly variants?: V

  /** Fallback variant state for each dimension when no prop is explicitly passed. */
  readonly defaults?: Partial<VariantProps<V>>

  /**
   * Conditional class rules that activate when all specified variant conditions
   * are simultaneously satisfied.
   */
  readonly compounds?: readonly CompoundVariant<V>[]

  /**
   * Named bundles of variant selections, activated by `variantKey` at render time.
   * Keys become the valid `variantKey` literal union on `PolymorphicRuntime`.
   */
  readonly presets?: TPreset

  /**
   * Per-tag CSS class overrides. When the rendered tag matches a key, its
   * mapped class is appended after the base class. Skipped when a `variantKey`
   * is active (preset rendering bypasses tag-map resolution).
   */
  readonly tags?: Readonly<TagMap>

  /**
   * Optional class pipeline plugin. When provided, the factory calls it with the resolved
   * options and uses the returned pipeline in place of the default `createClassPipeline`.
   * The plugin may also declare `ownedKeys` — prop keys it consumes — which adapters can
   * use to strip those keys before they reach the DOM or framework bindings.
   */
  readonly plugin?: ClassPluginFactory<TPluginProps>

  /**
   * Pre-computed variant-class lookup map. Injected by `classExtractPlugin` at build time;
   * not intended for manual use. Keys use the same format as the `VariantClassResolver`
   * cache (variant-only props, sorted, serialized).
   */
  readonly precomputedClasses?: Readonly<Record<string, string>>
}

/**
 * Structural enforcement configuration — ARIA policy rules, child structure rules,
 * and the shared strict mode that controls how violations are surfaced.
 */
export type EnforcementOptions = {
  /** Controls how structural validation errors (ARIA, children, props) are surfaced. */
  readonly strict?: StrictMode

  /**
   * Additional ARIA policy rules appended to the default pipeline. Each rule
   * receives the same `AriaContext` snapshot as built-in rules and may return
   * violations and auto-fixes. Runs only for tags that have an implicit ARIA role.
   */
  readonly aria?: readonly AriaRule[]

  /** Rules that normalized children must satisfy. Evaluated on every render when present. */
  readonly children?: readonly ChildRuleInput[]
}

/**
 * Configuration object accepted by `createPolymorphic`.
 *
 * Generic parameters flow left-to-right by dependency:
 * - `TDefault`     — the fallback element type, influences valid prop shapes
 * - `Props`        — the component's own prop surface
 * - `V`            — the variant dimension map, depends on props being settled
 * - `TPreset`      — named preset selections, must be valid variant subsets
 * - `TPluginProps` — extra props introduced by the class plugin (e.g. `LayoutProps`);
 *                    inferred from `styling.plugin` — callers do not set this
 *
 * All fields are `readonly` — factory config is immutable after construction.
 */
export type FactoryOptions<
  TDefault extends ElementType = ElementType,
  Props extends AnyRecord = EmptyRecord,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends PresetMap<V> = Readonly<EmptyRecord>,
  TPluginProps extends AnyRecord = EmptyRecord,
> = {
  /** The element type rendered when no `as` prop is supplied. Defaults to `'div'`. */
  readonly tag?: TDefault

  /** Identifier used in dev tooling and validation error messages. */
  readonly name?: string

  /** Prop values merged in before caller-supplied props. Caller wins on conflict. */
  readonly defaults?: Partial<Props>

  /** Class composition — variants, base class, presets, tag overrides, and pipeline plugin. */
  readonly styling?: StylingOptions<V, TPreset, TPluginProps>

  /** Structural enforcement — ARIA rules, child rules, and strict mode. */
  readonly enforcement?: EnforcementOptions
}
