import type { ClassPipelineOptions } from './class-pipeline-options'
import type { ClassPipelineFn } from './class-pipeline'
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

/** Combined class resolver plus the retained direct partner metadata used for variant selection. */
export type CompositionClassResolver = ClassPipelineFn & {
  readonly partner: CompositionStyleContract
  /** Plugin-owned props consumed by the composition-selected class pipeline. */
  readonly ownedKeys: ReadonlySet<string>
}
