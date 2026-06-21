import type { Pass } from './Pass'
import type { Pipeline } from './Pipeline'

export type PipelineNode<TContext> = Pass<TContext> | Pipeline<TContext>
