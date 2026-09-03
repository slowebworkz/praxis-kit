import type { Pipeline, Arguments, PipelineStage } from './types'

/** Chains two pipelines: `first`'s output feeds `second`'s single argument. The result is
 *  itself a Pipeline<TArgs, TOutput> — it can be passed right back into composePipelines as
 *  either `first` or `second` of a further composition. That closure-under-composition is the
 *  point: pipeline segments nest without a special "composed pipeline" type of their own. */
export function composePipelines<TArgs extends Arguments, TMid, TOutput>(
  first: Pipeline<TArgs, TMid>,
  second: PipelineStage<TMid, TOutput>,
): Pipeline<TArgs, TOutput> {
  return (...args: TArgs) => second(first(...args))
}
