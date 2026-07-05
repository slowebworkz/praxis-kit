import type { Arguments, Pipeline, PipelineTuple, Tuple } from './types'

/**
 * Creates a pipeline that applies every pipeline in `pipelines` to the same
 * argument list and returns their results as a tuple.
 *
 * The returned tuple preserves the output type of each pipeline at its
 * corresponding index, analogous to how `Promise.all()` preserves the resolved
 * types of a tuple of promises.
 *
 * Pipelines are invoked synchronously and in order when the returned pipeline
 * is called.
 */
export function allPipelines<TArgs extends Arguments, TOutputs extends Tuple>(
  pipelines: PipelineTuple<TArgs, TOutputs>,
): Pipeline<TArgs, TOutputs> {
  return (...args: TArgs) => pipelines.map((p) => p(...args)) as unknown as TOutputs
}

/**
 * Creates a pipeline that applies each pipeline in `pipelines` to the same
 * argument list until one returns a defined value.
 *
 * Pipelines are evaluated synchronously in order. The first result that is not
 * `undefined` is returned; if every pipeline returns `undefined`, the returned
 * pipeline also returns `undefined`.
 *
 * This generalizes the common fallback pattern of evaluating candidate
 * pipelines until one produces a result.
 */
export function anyPipeline<TArgs extends Arguments, TOutput>(
  pipelines: readonly Pipeline<TArgs, TOutput | undefined>[],
): Pipeline<TArgs, TOutput | undefined> {
  return (...args: TArgs) => {
    for (const pipeline of pipelines) {
      const result = pipeline(...args)
      if (result !== undefined) return result
    }
    return undefined
  }
}
