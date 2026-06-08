import type { VariantMap } from './variant'
import type {
  BaseClassOptions,
  CVASystemOptions,
  PresetOptions,
  PresetTarget,
  StyleOptions,
  TagMapOptions,
} from '@praxis-kit/shared/types'

export type {
  BaseClassOptions,
  CVASystemOptions,
  PresetOptions,
  PresetTarget,
  StyleOptions,
  TagMapOptions,
}

interface PrecomputedClassesOptions {
  /** Static variant-class map injected by `classExtractPlugin`. Keys use the same format as `VariantClassResolver` cache keys (variant-only props, sorted). */
  precomputedClasses?: Readonly<Record<string, string>>
}

export type CompositionOptions<TVariants extends VariantMap = VariantMap> = TagMapOptions &
  PresetOptions<TVariants> &
  PrecomputedClassesOptions

export type ClassPipelineOptions<TVariants extends VariantMap = VariantMap> =
  StyleOptions<TVariants> & CompositionOptions<TVariants>
