import type { PipelineNode } from './PipelineNode'
import type { PipelineStrategy } from './PipelineStrategy'

export interface Pipeline<TContext> {
  name: string
  strategy: PipelineStrategy
  nodes: Map<string, PipelineNode<TContext>>
}
