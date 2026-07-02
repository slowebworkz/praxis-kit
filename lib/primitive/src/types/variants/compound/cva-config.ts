import type { VariantMap } from '..'
import type { CVACompounds } from './cva-compounds'
import type { CVADefaults } from './cva-defaults'
import type { CVAVariants } from './cva-variants'

export type CVAConfig<V extends VariantMap> = CVAVariants<V> & CVADefaults<V> & CVACompounds<V>
