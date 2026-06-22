import { isPass } from './is-pass'
import type { Pipeline } from './types'

export async function executePipeline<TContext>(
  pipeline: Pipeline<TContext>,
  initial: TContext,
): Promise<TContext> {
  let ctx = initial
  for (const node of pipeline.nodes.values()) {
    if (isPass(node)) {
      const result = await node.execute(ctx)
      if (result.context !== undefined) {
        ctx = pipeline.merge.merge(ctx, result.context)
      }
    }
  }
  return ctx
}
