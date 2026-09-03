// `../pk`'s `@praxis-kit/pipeline` carried a node/tree/capability/merge model that the rewritten
// `lib/pipeline` (Pass / runPipeline / phased composition) intentionally dropped. `runtime`'s
// render-time IRs still use these small shapes, so they live here — a runtime-owned home for the
// pieces that were always more "runtime" than "generic pipeline". `Diagnostic` / `MetadataMap`
// survived the rewrite and are re-exported straight through.

import type { StringMap } from '@praxis-kit/primitive'

export type { Diagnostic, MetadataMap, Pass, PassResult, PipelineNode } from '@praxis-kit/pipeline'

/** Opaque identifier for a node in a component/native tree. */
export type NodeId = string

/** A named slot on a component. */
export type SlotName = string

/** A component's boolean capability flags, keyed by capability name. */
export type CapabilityMap = StringMap<boolean>

/** Folds an incoming partial context into an accumulated one. `runtime`'s
 *  `componentMergeStrategy` / compiler algebra implement this per domain. */
export interface MergeStrategy<TContext> {
  merge(previous: TContext, incoming: Partial<TContext>): TContext
}
