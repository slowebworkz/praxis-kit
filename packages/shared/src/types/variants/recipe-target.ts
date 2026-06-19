import type { VariantMap } from './variant-map'
import type { VariantSelection } from './variant-selection'

export type RecipeTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>
