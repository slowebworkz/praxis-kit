import type { RequireAtLeastOne, Simplify } from 'type-fest'
import type { EmptyRecord, NonEmptyArray } from '../../primitives'
import type { VariantKey, VariantMap, VariantValue } from '..'

type RequireAtLeastOneIfNotEmpty<T> = keyof T extends never ? EmptyRecord : RequireAtLeastOne<T>

type CompoundVariantConditionValue<V extends VariantMap, K extends keyof V> =
  | VariantKey<V, K>
  | NonEmptyArray<VariantKey<V, K>>

type CompoundVariantConditions<V extends VariantMap> = Simplify<{
  [K in keyof V]: CompoundVariantConditionValue<V, K>
}>

type CompoundVariantRequiredConditions<V extends VariantMap> = RequireAtLeastOneIfNotEmpty<
  CompoundVariantConditions<V>
>

type CompoundVariantBase<V extends VariantMap> = keyof V extends never
  ? EmptyRecord
  : CompoundVariantRequiredConditions<V>

export type CompoundVariant<V extends VariantMap> = CompoundVariantBase<V> & {
  class: VariantValue
}
