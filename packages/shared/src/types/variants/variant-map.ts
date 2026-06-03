import type { VariantValue } from './variant-value'

type VariantStates<K extends string = string> = Record<K, VariantValue>

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
