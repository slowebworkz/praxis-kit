import type { VariantMap } from '../variants/variant-map'
import type { PresetOptions } from './preset-options'
import type { TagMapOptions } from './tag-map-options'
import type { Simplify } from 'type-fest'

export type CompositionOptions<TVariants extends VariantMap = VariantMap> = Simplify<
  TagMapOptions & PresetOptions<TVariants>
>
