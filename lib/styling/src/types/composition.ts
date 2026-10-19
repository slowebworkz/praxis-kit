import type { ClassPipelineOptions } from './class-pipeline-options'
import type { VariantMap } from './variant'

/** Runtime styling metadata retained for one Praxis contract. */
export type CompositionStyleContract = ClassPipelineOptions<VariantMap>

export interface CompositionStyleOptions {
  /** The component being defined; its incompatible variant definitions take precedence. */
  primary: CompositionStyleContract
  /** The direct `compose.with` target, when it exposes Praxis styling metadata. */
  partner?: CompositionStyleContract
  /** Composition-scoped defaults, applied below recipe values and primary defaults. */
  composeDefaults?: ClassPipelineOptions<VariantMap>['defaultVariants']
  /** Construction-time diagnostic for incompatible same-name variant definitions. */
  onDiagnostic?: (message: string) => void
}

export type CompositionTagMap = ClassPipelineOptions<VariantMap>['tagMap']
export type CompositionVariants = ClassPipelineOptions<VariantMap>['variants']
