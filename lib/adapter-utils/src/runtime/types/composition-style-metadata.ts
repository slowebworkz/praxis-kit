import type {
  ClassPipelineFn,
  CompositionClassResolver as StylingCompositionClassResolver,
} from '@praxis-kit/styling'
import type { RetainedCompositionStyleMetadata } from '@praxis-kit/core/internal/composition-style'

export type StyleMetadata = RetainedCompositionStyleMetadata

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
  readonly onPluginConflict?: (message: string) => void
}

/** The core runtime's resolver with the direct partner metadata retained for prop selection. */
export type CompositionClassResolver = StylingCompositionClassResolver
