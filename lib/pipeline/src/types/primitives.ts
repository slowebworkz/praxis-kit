/** A value that may already be resolved, or a promise of it. Compiler passes may
 *  be async; runtime passes stay synchronous. Both satisfy `Pass.execute`. */
export type MaybePromise<T> = T | Promise<T>

/** Free-form key/value bag a pass may attach to its result for downstream
 *  tooling. Not merged into the pipeline context. */
export type MetadataMap = Record<string, unknown>

/** How a pipeline runs its nodes. `sequential` puts a barrier between each node
 *  (every node sees the previous node's merged context); `parallel` runs every
 *  node against the same input and merges the results after completion, failing
 *  if two nodes wrote the same context key. Set per pipeline via
 *  `Pipeline.strategy`; `sequential` is the default. */
export type PipelineStrategy = 'sequential' | 'parallel'
