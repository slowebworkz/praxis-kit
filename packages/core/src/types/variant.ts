/**
 * Converts `"true"` / `"false"` string literal keys to `boolean`.
 *
 * CVA-style boolean variants are authored with string keys (`"true"`, `"false"`)
 * because object keys must be strings, but callers expect to pass actual booleans.
 * This transform bridges that gap so `disabled?: boolean` surfaces correctly.
 */
type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T

/**
 * The CSS class map for a single variant dimension.
 * Keys are variant state names; values are the classes applied when active.
 */
type VariantStates<K extends string = string> = Record<K, VariantValue>

// ─── Public types ────────────────────────────────────────────────────────────

/** A CSS class string or an array of class strings assigned to a variant state. */
export type VariantValue = string | string[]

/**
 * A map of variant dimensions to their possible states.
 *
 * Each key is a dimension name (e.g. `size`, `intent`); each value is a
 * `VariantStates` record mapping state names to CSS classes.
 *
 * @example
 * const variants = {
 *   size:   { sm: 'text-sm', lg: 'text-lg' },
 *   intent: { primary: 'text-blue-500', danger: 'text-red-500' },
 * } satisfies VariantMap
 */
export type VariantMap<V extends string = string, K extends string = string> = Record<
  V,
  VariantStates<K>
>

/**
 * The accepted prop value for a single variant dimension `K` of map `V`.
 *
 * Applies `StringToBoolean` so dimensions keyed with `"true"` / `"false"`
 * surface as `boolean` at the call site rather than the raw string literals.
 *
 * Not part of the public barrel — exported for use in `CompoundVariant`.
 */
export type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<
  keyof V[K] & string
>

/**
 * The full optional prop surface exposed to callers for a given variant map.
 *
 * Every dimension is optional — omitting a key falls through to `defaultVariants`,
 * then to no class if no default is set.
 */
export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

/**
 * Fallback variant state for each dimension when no prop is explicitly passed.
 *
 * Structurally identical to `VariantProps` but semantically distinct: these
 * values are authored at factory definition time, not resolved at render time.
 */
export type DefaultVariants<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

/**
 * A partial selection of variant states authored at factory definition time.
 *
 * Uses `keyof V[K]` directly (not `VariantKey`) so TypeScript can eagerly
 * resolve the union at constraint-check time without deferred conditional types.
 * This ensures invalid state names (e.g. `display: 'banana'`) are caught at
 * the call site rather than slipping through as widened `string`.
 */
export type VariantSelection<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K]
}

/**
 * A static, immutable map of named presets to partial variant selections.
 *
 * Presets are named bundles of variant props that callers can activate by key
 * via `variantKey`, avoiding the need to repeat variant combinations at each
 * call site. The outer record is frozen; values are partial so presets need not
 * specify every dimension.
 */
export type PresetMap<V extends VariantMap = VariantMap> = Readonly<
  Record<string, VariantSelection<V>>
>
