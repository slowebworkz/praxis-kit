import type { VariantMap } from '../variant-map'
import type { CompoundVariant } from './compound-variant'

export interface CVACompounds<V extends VariantMap> {
  compoundVariants?: readonly CompoundVariant<V>[]
}
