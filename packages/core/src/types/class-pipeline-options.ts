import type { CVACompounds, CVADefaults, CVAVariants } from './compound-variants'
import type { ClassName, TagMap } from './primitives'
import type { VariantMap, VariantSelection } from './variant'

/** Always-applied base class, independent of tag or variant state. */
interface BaseClassOptions {
  baseClassName?: ClassName
}

/** Per-tag class overrides applied when the rendered element matches a key. */
interface TagMapOptions {
  tagMap?: TagMap
}

/* ---------------- CVA SYSTEM ---------------- */

/**
 * The full CVA configuration surface: variant dimensions, default variant
 * states, and compound variant rules. Matches the shape accepted by the
 * underlying `cva()` helper.
 */
export type CVASystemOptions<TVariants extends VariantMap = VariantMap> = CVAVariants<TVariants> &
  CVADefaults<TVariants> &
  CVACompounds<TVariants>

/* ---------------- STYLE LAYER ---------------- */

/**
 * All style-producing configuration: base class plus the full CVA system.
 *
 * This is the minimal surface needed to compute classes independently of
 * structural concerns (tag routing, preset lookup).
 */
export type StyleOptions<TVariants extends VariantMap = VariantMap> = BaseClassOptions &
  CVASystemOptions<TVariants>

/* ---------------- PRESET LAYER ---------------- */

/** A partial variant selection used as a preset/recipe value. */
export type PresetTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>

/** Named preset bundles, each selecting a subset of variant states by key. */
interface PresetOptions<TVariants extends VariantMap = VariantMap> {
  presetMap?: Record<string, PresetTarget<TVariants>>
}

/* ---------------- RUNTIME EXTENSIONS ---------------- */

/**
 * Structural configuration that extends styling: tag routing and preset lookup.
 * Combined with `StyleOptions` to form the complete pipeline input.
 */
type CompositionOptions<TVariants extends VariantMap = VariantMap> = TagMapOptions &
  PresetOptions<TVariants>

/* ---------------- ROOT ---------------- */

/**
 * The complete input accepted by `createClassPipeline`.
 *
 * Combines all style-producing and structural options into a single flat shape.
 * This is what `ResolvedFactoryOptions` is structurally compatible with.
 */
export type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> =
  StyleOptions<TVariants> & CompositionOptions<TVariants>
