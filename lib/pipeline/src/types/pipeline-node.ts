import type { Pass } from './pass'
import type { Pipeline } from './pipeline'

export type PipelineNode<TContext> = Pass<TContext> | Pipeline<TContext>
