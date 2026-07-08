import type { VariantMap } from '../variant-map'
import type { CVACompounds } from './cva-compounds'
import type { CVADefaults } from './cva-defaults'
import type { CVAVariants } from './cva-variants'

export type CVAConfig<V extends VariantMap> = CVAVariants<V> & CVADefaults<V> & CVACompounds<V>
