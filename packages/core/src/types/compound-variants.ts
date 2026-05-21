import type { RequireAtLeastOne, Simplify } from 'type-fest'
import type { NonEmptyArray } from './non-empty-array'
import type { DefaultVariants, VariantKey, VariantMap, VariantValue } from './variant'

/**
 * Applies `RequireAtLeastOne` only when `T` has keys; returns `{}` for empty objects.
 * Avoids the union explosion that `RequireAtLeastOne<{}>` would produce.
 */
type _RequireAtLeastOneIfNotEmpty<T> = keyof T extends never
  ? Record<never, never>
  : RequireAtLeastOne<T>

/**
 * Accepted value for a single variant key condition.
 * A single state name, or a non-empty array of state names (any of which satisfies the condition).
 */
type _CompoundVariantConditionValue<V extends VariantMap, K extends keyof V> =
  | VariantKey<V, K>
  | NonEmptyArray<VariantKey<V, K>>

/**
 * Maps each variant dimension to its accepted condition value(s).
 * Flattened via `Simplify` for readable hover output.
 */
type _CompoundVariantConditions<V extends VariantMap> = Simplify<{
  [K in keyof V]: _CompoundVariantConditionValue<V, K>
}>

/**
 * Requires at least one variant dimension to be specified as a condition.
 * Prevents meaningless rules that carry no conditions (e.g. `{ class: '...' }` alone).
 */
type _CompoundVariantRequiredConditions<V extends VariantMap> = _RequireAtLeastOneIfNotEmpty<
  _CompoundVariantConditions<V>
>

/**
 * Resolves to the condition constraint for a given variant map:
 * - Empty map → `{}` (no conditions to specify)
 * - Non-empty map → at least one condition required
 */
type _CompoundVariantBase<V extends VariantMap> = keyof V extends never
  ? Record<never, never>
  : _CompoundVariantRequiredConditions<V>

/**
 * A single compound variant rule.
 *
 * Specifies a set of variant conditions that, when all simultaneously active,
 * cause `class` to be added to the computed class string.
 *
 * At least one condition key must be present. Each key accepts either a single
 * state name or a non-empty array (any element satisfies the condition).
 *
 * @example
 * { intent: 'primary', size: 'lg', class: 'shadow-md uppercase' }
 * { intent: ['primary', 'secondary'], size: 'sm', class: 'font-semibold' }
 */
export type CompoundVariant<V extends VariantMap> = _CompoundVariantBase<V> & {
  class: VariantValue
}

// ─── CVAConfig intermediate types ────────────────────────────────────────────

/** The `variants` slice of a CVA config object. */
export interface CVAVariants<V extends VariantMap> {
  variants?: V
}

/** The `defaultVariants` slice of a CVA config object. */
export interface CVADefaults<V extends VariantMap> {
  defaultVariants?: DefaultVariants<V>
}

/** The `compoundVariants` slice of a CVA config object. */
export interface CVACompounds<V extends VariantMap> {
  compoundVariants?: readonly CompoundVariant<V>[]
}

/** Complete configuration object accepted by the `cva()` helper. */
export type CVAConfig<V extends VariantMap> = CVAVariants<V> & CVADefaults<V> & CVACompounds<V>
