import { isPass } from './is-pass'
import type { Pipeline, PipelineNode } from './types'

async function executeNode<TContext>(
  node: PipelineNode<TContext>,
  ctx: TContext,
  pipeline: Pipeline<TContext>,
): Promise<TContext> {
  if (isPass(node)) {
    const result = await node.execute(ctx)
    if (result.context !== undefined) {
      return pipeline.merge.merge(ctx, result.context)
    }
    return ctx
  }
  return executePipeline(node, ctx)
}

export async function executePipeline<TContext>(
  pipeline: Pipeline<TContext>,
  initial: TContext,
): Promise<TContext> {
  let ctx = initial
  for (const node of pipeline.nodes.values()) {
    ctx = await executeNode(node, ctx, pipeline)
  }
  return ctx
}
