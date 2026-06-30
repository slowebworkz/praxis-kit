import type { VariantValue } from './variant-value'

export type VariantStates<K extends string = string> = Record<K, VariantValue>
