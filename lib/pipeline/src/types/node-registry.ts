import type { NodeOwner } from './node-owner'
import type { PipelineNode } from './pipeline-node'

export type NodeRegistry<TContext> = {
  nodes: Map<string, PipelineNode<TContext>>
  owners: Map<string, NodeOwner>
}
