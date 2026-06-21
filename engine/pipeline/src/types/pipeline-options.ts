import type { Pipeline } from './pipeline'
import type { PipelineNode } from './pipeline-node'
import type { Plugin } from './plugin'

export interface PipelineOptions<TContext> extends Pick<
  Pipeline<TContext>,
  'name' | 'strategy' | 'merge'
> {
  nodes: ReadonlyMap<string, PipelineNode<TContext>>
  plugins?: Plugin<TContext>[]
}
