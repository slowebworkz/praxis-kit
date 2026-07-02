import type { MergeStrategy } from './types/merge-strategy'
import { isPass } from './is-pass'
import type { Processor } from './types'

export async function executeProcessor<TContext>(
  processor: Processor<TContext>,
  ctx: TContext,
  merge: MergeStrategy<TContext>,
): Promise<TContext> {
  if (isPass(processor)) {
    const result = await processor.execute(ctx)
    if (result.context !== undefined) {
      return merge.merge(ctx, result.context)
    }
    return ctx
  }
  let inner = ctx
  for (const node of processor.nodes.values()) {
    inner = await executeProcessor(node, inner, processor.merge)
  }
  return inner
}
