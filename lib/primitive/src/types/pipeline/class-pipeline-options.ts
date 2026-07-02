import type { VariantMap } from '../variants'
import type { CompositionOptions } from './composition-options'
import type { StyleOptions } from './style-options'
import type { Simplify } from 'type-fest'

export type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> = Simplify<
  StyleOptions<TVariants> & CompositionOptions<TVariants>
>
