import type { Pipeline } from './pipeline'
import type { PipelineNode } from './pipeline-node'
import type { Plugin } from './plugin'

export interface PipelineOptions<TContext> extends Pick<Pipeline<TContext>, 'name' | 'strategy'> {
  nodes: Map<string, PipelineNode<TContext>>
  plugins?: Plugin<TContext>[]
}
