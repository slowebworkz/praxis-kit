import type { Booleanish, Numberish, Primitive } from '../primitives'
import type { VariantMap } from './variant-map'

type NormalizedVariantValue<K extends string> = string extends K
  ? Primitive
  : K extends 'true' | 'false'
    ? Booleanish
    : K extends `${number}`
      ? Numberish
      : K

export type DefaultVariants<V extends VariantMap> = {
  [K in keyof V]?: NormalizedVariantValue<keyof V[K] & string>
}
