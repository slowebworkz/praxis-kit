import type { VariantMap } from './variant-map'
import type { VariantSelection } from './variant-selection'

export type PresetTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>
