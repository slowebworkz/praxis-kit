import type { Arguments, Pipeline, PipelineTuple, Tuple } from './types'

function* pipelineResults<TArgs extends Arguments, TOutput>(
  pipelines: readonly Pipeline<TArgs, TOutput>[],
  args: TArgs,
): Iterable<TOutput> {
  for (const pipeline of pipelines) {
    yield pipeline(...args)
  }
}

export function allPipelines<TArgs extends Arguments, TOutputs extends Tuple>(
  pipelines: PipelineTuple<TArgs, TOutputs>,
): Pipeline<TArgs, TOutputs> {
  return (...args: TArgs) => [...pipelineResults(pipelines, args)] as unknown as TOutputs
}

export function anyPipeline<TArgs extends Arguments, TOutput>(
  pipelines: readonly Pipeline<TArgs, TOutput | undefined>[],
): Pipeline<TArgs, TOutput | undefined> {
  return (...args: TArgs) => {
    for (const result of pipelineResults(pipelines, args)) {
      if (result !== undefined) return result
    }
    return undefined
  }
}
