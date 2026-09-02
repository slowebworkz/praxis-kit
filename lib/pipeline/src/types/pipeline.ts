import type { Pass } from './pass'

/** A node in a pipeline: either a leaf `Pass` or a nested `Pipeline`. The tree is
 *  recursive so a pipeline can be composed from smaller pipelines and dropped in
 *  wherever a pass is expected. */
export type PipelineNode<TContext> = Pass<TContext> | Pipeline<TContext>

/** An ordered tree of passes. A `Pipeline` only *describes* the work — `name`
 *  plus the `nodes` to run; executing it (and deciding sync vs async, sequential
 *  vs parallel) is the executor's job, not a method here. This keeps the shape
 *  declarative and framework-neutral, like `Pass`. */
export interface Pipeline<TContext> {
  name: string
  nodes: readonly PipelineNode<TContext>[]
}
