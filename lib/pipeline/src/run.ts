import type { Diagnostic, MetadataMap, Pipeline, PipelineNode } from './types'
import { mergeContext } from './merge'

/** The outcome of running a pipeline. Unlike `PassResult` — a *patch* a single
 *  pass proposes — this is the fully accumulated state: the final context, and
 *  every diagnostic and metadata entry collected along the way. The executor
 *  owns this; a pass never sees it. */
export interface RunResult<TContext> {
  context: TContext
  diagnostics: Diagnostic[]
  /** Shallow-merged across nodes in run order — a later node's key wins. Passes
   *  that must not collide should namespace their keys (e.g. by pass name). */
  metadata: MetadataMap
}

/** A node is a nested pipeline when it carries `nodes`; otherwise it is a leaf
 *  `Pass`. */
function isPipeline<TContext>(
  node: PipelineNode<TContext>,
): node is Pipeline<TContext> {
  return 'nodes' in node
}

/** Run one pipeline sequentially: a barrier between every node, so each node
 *  sees the previous node's merged context. Nested pipelines run in place and
 *  fold their whole result into the parent's accumulation. Always async — a
 *  node may be an async (`MaybePromise`) pass; a synchronous fast path is a
 *  later performance concern, not this commit's. */
export async function runPipeline<TContext>(
  pipeline: Pipeline<TContext>,
  input: TContext,
): Promise<RunResult<TContext>> {
  let context = input
  const diagnostics: Diagnostic[] = []
  let metadata: MetadataMap = {}

  for (const node of pipeline.nodes) {
    if (isPipeline(node)) {
      const nested = await runPipeline(node, context)
      context = nested.context
      diagnostics.push(...nested.diagnostics)
      metadata = { ...metadata, ...nested.metadata }
      continue
    }

    // `await` normalises the pass's sync-or-async (`MaybePromise`) return.
    const result = await node.execute(context)
    context = mergeContext(context, result.context)
    if (result.diagnostics) diagnostics.push(...result.diagnostics)
    if (result.metadata) metadata = { ...metadata, ...result.metadata }
  }

  return { context, diagnostics, metadata }
}
