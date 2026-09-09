import type { CVACompounds, CVADefaults, CVAVariants, VariantMap } from '../variants'
import type { Simplify } from 'type-fest'

export type CVASystemOptions<TVariants extends VariantMap = VariantMap> = Simplify<
  CVAVariants<TVariants> & CVADefaults<TVariants> & CVACompounds<TVariants>
>
