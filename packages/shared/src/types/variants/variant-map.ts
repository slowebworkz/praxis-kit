import type { VariantStates } from './variant-states'

export type VariantMap<V extends string = string, K extends string = string> = Record<
  V,
  VariantStates<K>
>
