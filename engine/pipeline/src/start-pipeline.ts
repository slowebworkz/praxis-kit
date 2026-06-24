import { createPipeline } from './create-pipeline'
import type { PipelineBuildOptions, PipelineBuilder, Processor } from './types'

function makeBuilder<TContext>(
  options: PipelineBuildOptions<TContext>,
  processors: ReadonlyArray<Processor<TContext>>,
): PipelineBuilder<TContext> {
  return {
    then(processor) {
      if (processor === undefined) return makeBuilder(options, processors)
      return makeBuilder(options, Object.freeze([...processors, processor]))
    },
    build() {
      const nodes = new Map<string, Processor<TContext>>()
      for (const processor of processors) {
        if (nodes.has(processor.name)) {
          throw new Error(
            `startPipeline: duplicate processor name "${processor.name}" in pipeline "${options.name}"`,
          )
        }
        nodes.set(processor.name, processor)
      }
      return createPipeline({ ...options, nodes })
    },
  }
}

export function startPipeline<TContext>(
  options: PipelineBuildOptions<TContext>,
): PipelineBuilder<TContext> {
  return makeBuilder(options, Object.freeze([]))
}
