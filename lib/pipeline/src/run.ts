import type { Diagnostic, MetadataMap, Pipeline, PipelineNode } from './types'
import { detectConflicts, mergeContext, shallowDiff } from './merge'

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

/** Thrown when a `parallel` pipeline's nodes write the same context key. With no
 *  ordering between them the merged result would be arbitrary, so this is a
 *  pipeline authoring error, not a diagnostic. */
export class ParallelConflictError extends Error {
  constructor(
    readonly pipeline: string,
    readonly keys: readonly PropertyKey[],
  ) {
    super(
      `parallel pipeline "${pipeline}" has nodes writing the same context ` +
        `key(s): ${keys.map(String).join(', ')}`,
    )
    this.name = 'ParallelConflictError'
  }
}

/** What one node contributed: a shallow context patch plus the diagnostics and
 *  metadata it produced. Uniform for a leaf `Pass` and a nested `Pipeline`, so
 *  both strategies fold nodes the same way. */
interface NodeOutcome<TContext> {
  patch: Partial<TContext>
  diagnostics: readonly Diagnostic[]
  metadata: MetadataMap
}

function isPipeline<TContext>(
  node: PipelineNode<TContext>,
): node is Pipeline<TContext> {
  return 'nodes' in node
}

/** Run one node against `input` and normalise its result to a `NodeOutcome`. A
 *  nested pipeline's patch is recovered by diffing its result against `input` —
 *  it saw the same context a sibling pass would. `await` normalises a pass's
 *  sync-or-async (`MaybePromise`) return. */
async function runNode<TContext>(
  node: PipelineNode<TContext>,
  input: TContext,
): Promise<NodeOutcome<TContext>> {
  if (isPipeline(node)) {
    const nested = await runPipeline(node, input)
    return {
      patch: shallowDiff(input, nested.context),
      diagnostics: nested.diagnostics,
      metadata: nested.metadata,
    }
  }

  const result = await node.execute(input)
  return {
    patch: result.context ?? {},
    diagnostics: result.diagnostics ?? [],
    metadata: result.metadata ?? {},
  }
}

/** Run a pipeline and accumulate a `RunResult`.
 *
 *  `sequential` (the default): a barrier between nodes — each node sees the
 *  previous node's merged context.
 *
 *  `parallel`: every node runs against the same `input`; the patches are checked
 *  for overlapping keys (`ParallelConflictError` if any) and then merged.
 *  Diagnostics and metadata still accumulate in node order for a stable result.
 *
 *  Always async — a node may be an async pass; a synchronous fast path is a
 *  later performance concern. A nested pipeline runs with its own strategy. */
export async function runPipeline<TContext>(
  pipeline: Pipeline<TContext>,
  input: TContext,
): Promise<RunResult<TContext>> {
  return pipeline.strategy === 'parallel'
    ? runParallel(pipeline, input)
    : runSequential(pipeline, input)
}

async function runSequential<TContext>(
  pipeline: Pipeline<TContext>,
  input: TContext,
): Promise<RunResult<TContext>> {
  let context = input
  const diagnostics: Diagnostic[] = []
  let metadata: MetadataMap = {}

  for (const node of pipeline.nodes) {
    const outcome = await runNode(node, context)
    context = mergeContext(context, outcome.patch)
    diagnostics.push(...outcome.diagnostics)
    metadata = { ...metadata, ...outcome.metadata }
  }

  return { context, diagnostics, metadata }
}

async function runParallel<TContext>(
  pipeline: Pipeline<TContext>,
  input: TContext,
): Promise<RunResult<TContext>> {
  const outcomes = await Promise.all(
    pipeline.nodes.map((node) => runNode(node, input)),
  )

  const conflicts = detectConflicts(outcomes.map((outcome) => outcome.patch))
  if (conflicts.length > 0) {
    throw new ParallelConflictError(pipeline.name, conflicts)
  }

  let context = input
  const diagnostics: Diagnostic[] = []
  let metadata: MetadataMap = {}
  for (const outcome of outcomes) {
    context = mergeContext(context, outcome.patch)
    diagnostics.push(...outcome.diagnostics)
    metadata = { ...metadata, ...outcome.metadata }
  }

  return { context, diagnostics, metadata }
}
