import { executeProcessor } from './execute-processor'
import type { Pipeline } from './types'

export async function executePipeline<TContext>(
  pipeline: Pipeline<TContext>,
  initial: TContext,
): Promise<TContext> {
  return executeProcessor(pipeline, initial, pipeline.merge)
}
