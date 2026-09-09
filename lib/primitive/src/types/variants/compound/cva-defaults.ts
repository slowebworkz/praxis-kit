import type { DefaultVariants } from '../default-variants'
import type { VariantMap } from '../variant-map'

export interface CVADefaults<V extends VariantMap> {
  defaultVariants?: DefaultVariants<V>
}
