import type { ComposeOptions, AnyClassPluginFactory } from '@praxis-kit/primitive'
import type { Diagnostics } from '@praxis-kit/diagnostics'
import type { CompositionStyleContract } from '@praxis-kit/styling'

/** Internal metadata retained on generated components for direct composition. */
export type RetainedCompositionStyleMetadata = CompositionStyleContract & {
  /** Original factory input; kept separate from mergeable style fields. */
  readonly pluginFactory?: AnyClassPluginFactory
}

/** Receives a human-readable message for a construction-time composition diagnostic. */
export type CompositionDiagnostic = (message: string) => void

/** Input to the optional composition styling pipeline. */
export type CompositionResolverOptions = {
  readonly primary: RetainedCompositionStyleMetadata
  readonly compose?: ComposeOptions
  readonly onDiagnostic?: CompositionDiagnostic
  readonly onPluginConflict?: CompositionDiagnostic
  readonly diagnostics?: Diagnostics
}

/** Options after the direct `compose.with` partner's retained metadata has been looked up. */
export type ResolvedCompositionResolverOptions = CompositionResolverOptions & {
  readonly partner: RetainedCompositionStyleMetadata | undefined
}
