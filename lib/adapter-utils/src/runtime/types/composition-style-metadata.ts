import type { VariantMap } from '@praxis-kit/core'
import type { ClassPipelineFn, ClassPipelineOptions } from '@praxis-kit/styling'

export type StyleMetadata = ClassPipelineOptions<VariantMap>

/** Internal request carrying the combined resolver through automatic adapter composition. */
export interface CompositionStyleRequest {
  resolveClasses: ClassPipelineFn
}

/** Configuration for constructing composition styling from a component's declared `compose`. */
export type OptionalCompositionStylePipelineOptions = {
  readonly primary: StyleMetadata
  /** The direct `compose.with` target. `undefined` means composition is not activated. */
  readonly with: unknown
  readonly composeDefaults?: object
  readonly onDiagnostic?: (message: string) => void
}

/** The pipeline's input once the partner's retained styling metadata has been looked up. */
export type ResolvedOptionalCompositionStylePipelineOptions =
  OptionalCompositionStylePipelineOptions & {
    readonly partner: StyleMetadata | undefined
  }
