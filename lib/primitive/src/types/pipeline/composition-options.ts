import type { VariantMap } from '../variants/variant-map'
import type { RecipeOptions } from './recipe-options'
import type { TagMapOptions } from './tag-map-options'
import type { Simplify } from 'type-fest'

export type CompositionOptions<TVariants extends VariantMap = VariantMap> = Simplify<
  TagMapOptions & RecipeOptions<TVariants>
>
