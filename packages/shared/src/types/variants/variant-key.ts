import type { VariantMap } from './variant-map'

/**
 * Converts `"true"` / `"false"` string literal keys to `boolean`.
 *
 * CVA-style boolean variants are authored with string keys because object keys
 * must be strings, but callers expect to pass actual booleans.
 */
type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T

/**
 * The accepted prop value for a single variant dimension `K` of map `V`.
 *
 * Applies `StringToBoolean` so dimensions keyed with `"true"` / `"false"`
 * surface as `boolean` at the call site rather than the raw string literals.
 */
export type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<
  keyof V[K] & string
>
