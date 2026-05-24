import type { RequireAtLeastOne, Simplify } from 'type-fest'
import type { NonEmptyArray } from './primitives'
import type { DefaultVariants, VariantKey, VariantMap, VariantValue } from './variant'

type _RequireAtLeastOneIfNotEmpty<T> = keyof T extends never
  ? Record<never, never>
  : RequireAtLeastOne<T>

type _CompoundVariantConditionValue<V extends VariantMap, K extends keyof V> =
  | VariantKey<V, K>
  | NonEmptyArray<VariantKey<V, K>>

type _CompoundVariantConditions<V extends VariantMap> = Simplify<{
  [K in keyof V]: _CompoundVariantConditionValue<V, K>
}>

type _CompoundVariantRequiredConditions<V extends VariantMap> = _RequireAtLeastOneIfNotEmpty<
  _CompoundVariantConditions<V>
>

type _CompoundVariantBase<V extends VariantMap> = keyof V extends never
  ? Record<never, never>
  : _CompoundVariantRequiredConditions<V>

export type CompoundVariant<V extends VariantMap> = _CompoundVariantBase<V> & {
  class: VariantValue
}

export interface CVAVariants<V extends VariantMap> {
  variants?: V
}

export interface CVADefaults<V extends VariantMap> {
  defaultVariants?: DefaultVariants<V>
}

export interface CVACompounds<V extends VariantMap> {
  compoundVariants?: readonly CompoundVariant<V>[]
}

export type CVAConfig<V extends VariantMap> = CVAVariants<V> & CVADefaults<V> & CVACompounds<V>
