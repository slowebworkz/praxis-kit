import type { Pass, PipelineNode } from './types'

export function isPass<TContext>(node: PipelineNode<TContext>): node is Pass<TContext> {
  return 'execute' in node
}
