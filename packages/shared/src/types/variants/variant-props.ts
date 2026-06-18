import type { Booleanish, Numberish, Primitive } from '../primitives'
import type { VariantKey } from './variant-key'
import type { VariantMap } from './variant-map'

/** The full optional prop surface exposed to callers for a given variant map. */
export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

type VariantValue<K extends string> = string extends K
  ? Primitive
  : K extends 'true' | 'false'
    ? Booleanish
    : K extends `${number}`
      ? Numberish
      : K

export type DefaultVariants<V extends VariantMap> = {
  [K in keyof V]?: VariantValue<keyof V[K] & string>
}
