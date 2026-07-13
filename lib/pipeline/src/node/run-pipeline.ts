import { executePipeline } from '../execute-pipeline'
import type { Pipeline } from '../types'

/**
 * Runs a pipeline as a CLI entry point: executes it, and on failure prints the
 * error and exits with a non-zero status. Centralizes the execute/report/exit
 * pattern that every pipeline-based script would otherwise repeat.
 */
export async function runPipeline<TContext>(
  pipeline: Pipeline<TContext>,
  context: TContext,
): Promise<void> {
  try {
    await executePipeline(pipeline, context)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
