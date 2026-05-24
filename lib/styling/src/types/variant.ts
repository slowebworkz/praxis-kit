type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T

type VariantStates<K extends string = string> = Record<K, VariantValue>

export type VariantValue = string | string[]

export type VariantMap<V extends string = string, K extends string = string> = Record<
  V,
  VariantStates<K>
>

export type VariantKey<V extends VariantMap, K extends keyof V> = StringToBoolean<
  keyof V[K] & string
>

export type VariantProps<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

export type DefaultVariants<V extends VariantMap> = {
  [K in keyof V]?: VariantKey<V, K>
}

export type VariantSelection<V extends VariantMap> = {
  [K in keyof V]?: keyof V[K]
}

export type PresetMap<V extends VariantMap = VariantMap> = Readonly<
  Record<string, VariantSelection<V>>
>
