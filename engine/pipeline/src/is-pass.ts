import type { Pass } from './types/pass'
import type { PipelineNode } from './types/pipeline-node'

export function isPass<TContext>(node: PipelineNode<TContext>): node is Pass<TContext> {
  return 'execute' in node
}
