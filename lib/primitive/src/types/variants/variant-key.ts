import type { StringToBoolean } from './string-to-boolean'
import type { VariantMap } from './variant-map'

export type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<
  keyof V[K] & string
>
