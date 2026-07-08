import type { VariantMap } from './variant-map'

/**
 * A partial selection of variant states authored at factory definition time.
 *
 * Uses `keyof V[K]` directly (not `VariantKey`) so TypeScript can eagerly
 * resolve the union at constraint-check time without deferred conditional types.
 */
export type VariantSelection<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K]
}
