import type { VariantKey } from './variant-key'
import type { VariantMap } from './variant-map'

/** The full optional prop surface exposed to callers for a given variant map. */
export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

export type DefaultVariants<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}
