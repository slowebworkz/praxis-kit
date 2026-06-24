import { createPipeline } from './create-pipeline'
import type { PipelineBuildOptions, PipelineBuilder, Processor } from './types'

function makeBuilder<TContext>(
  options: PipelineBuildOptions<TContext>,
  processors: ReadonlyArray<Processor<TContext>>,
): PipelineBuilder<TContext> {
  return {
    then(processor) {
      if (processor === undefined) return makeBuilder(options, processors)
      return makeBuilder(options, [...processors, processor])
    },
    build() {
      return createPipeline({
        ...options,
        nodes: new Map(processors.map((p) => [p.name, p])),
      })
    },
  }
}

export function startPipeline<TContext>(
  options: PipelineBuildOptions<TContext>,
): PipelineBuilder<TContext> {
  return makeBuilder(options, [])
}
