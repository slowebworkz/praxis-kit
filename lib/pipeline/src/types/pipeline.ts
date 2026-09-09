import type { Pass } from './pass'
import type { PipelineStrategy } from './primitives'

/** A node in a pipeline: either a leaf `Pass` or a nested `Pipeline`. The tree is
 *  recursive so a pipeline can be composed from smaller pipelines and dropped in
 *  wherever a pass is expected. */
export type PipelineNode<TContext> = Pass<TContext> | Pipeline<TContext>

/** An ordered tree of passes. A `Pipeline` only *describes* the work — `name`,
 *  the `nodes` to run, and how to run them; performing the run is the executor's
 *  job, not a method here. This keeps the shape declarative and
 *  framework-neutral, like `Pass`. */
export interface Pipeline<TContext> {
  name: string
  nodes: readonly PipelineNode<TContext>[]
  /** How this pipeline's own nodes run. `sequential` (the default when omitted)
   *  puts a barrier between nodes; `parallel` runs them all against the same
   *  input and merges after. Set per pipeline, so a tree can mix strategies at
   *  different levels. */
  strategy?: PipelineStrategy
}
