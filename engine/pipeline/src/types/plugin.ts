import type { PipelineNode } from './pipeline-node'

export interface Plugin<TContext> {
  name: string
  nodes: Map<string, PipelineNode<TContext>>
}
