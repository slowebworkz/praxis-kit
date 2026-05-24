import type { CVACompounds, CVADefaults, CVAVariants } from './compound-variants'
import type { TagMap } from './primitives'
import type { VariantMap, VariantSelection } from './variant'

interface BaseClassOptions {
  baseClassName?: string
}

interface TagMapOptions {
  tagMap?: TagMap
}

export type CVASystemOptions<TVariants extends VariantMap = VariantMap> = CVAVariants<TVariants> &
  CVADefaults<TVariants> &
  CVACompounds<TVariants>

export type StyleOptions<TVariants extends VariantMap = VariantMap> = BaseClassOptions &
  CVASystemOptions<TVariants>

export type PresetTarget<TVariants extends VariantMap = VariantMap> = VariantSelection<TVariants>

interface PresetOptions<TVariants extends VariantMap = VariantMap> {
  presetMap?: Record<string, PresetTarget<TVariants>>
}

type CompositionOptions<TVariants extends VariantMap = VariantMap> = TagMapOptions &
  PresetOptions<TVariants>

export type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> =
  StyleOptions<TVariants> & CompositionOptions<TVariants>
