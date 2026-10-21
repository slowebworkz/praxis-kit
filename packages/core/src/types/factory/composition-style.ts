import type { ComposeOptions } from '@praxis-kit/primitive'
import type { CompositionStyleContract } from '@praxis-kit/styling'

/** Receives a human-readable message for a construction-time composition diagnostic. */
export type CompositionDiagnostic = (message: string) => void

/** Input to the optional composition styling pipeline: the primary contract's retained styling
 *  metadata plus the component's `compose` options. Named `Composition…` to stay distinct from the
 *  class resolver's own `ResolverOptions`. */
export type CompositionResolverOptions = {
  readonly primary: CompositionStyleContract
  readonly compose?: ComposeOptions
  readonly onDiagnostic?: CompositionDiagnostic
}

/** {@link CompositionResolverOptions} after the direct `compose.with` partner's retained metadata
 *  has been looked up; `undefined` for an external or unannotated partner. */
export type ResolvedCompositionResolverOptions = CompositionResolverOptions & {
  readonly partner: CompositionStyleContract | undefined
}
