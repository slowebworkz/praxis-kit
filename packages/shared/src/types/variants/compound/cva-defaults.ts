import type { DefaultVariants } from '../variant-props'
import type { VariantMap } from '../variant-map'

export interface CVADefaults<V extends VariantMap> {
  defaultVariants?: DefaultVariants<V>
}
