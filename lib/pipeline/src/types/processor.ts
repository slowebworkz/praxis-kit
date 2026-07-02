import type { Pass } from './pass'
import type { Pipeline } from './pipeline'

export type Processor<TContext> = Pass<TContext> | Pipeline<TContext>
