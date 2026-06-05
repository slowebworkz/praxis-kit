import type { VariantMap } from '../variants'
import type { BaseClassOptions } from './base-class-options'
import type { CVASystemOptions } from './cva-system-options'
import type { Simplify } from 'type-fest'

export type StyleOptions<TVariants extends VariantMap = VariantMap> = Simplify<
  BaseClassOptions & CVASystemOptions<TVariants>
>
