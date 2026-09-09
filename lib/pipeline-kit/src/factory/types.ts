import type { UnknownRecord } from 'type-fest'
import type { Pipeline, Arguments } from '../core/types'

/**
 * The shape of a resolved pipeline configuration.
 *
 * Resolved configurations are immutable records produced by an options
 * resolution step and are suitable for identity-based caching.
 */
export type ResolvedConfig = UnknownRecord

/**
 * A factory that builds a pipeline from a resolved configuration.
 *
 * Pipeline factories separate configuration resolution from pipeline
 * construction, allowing the resulting pipeline to be cached and reused.
 */
export type PipelineFactory<TResolved extends ResolvedConfig, TArgs extends Arguments, TOutput> = (
  resolved: TResolved,
) => Pipeline<TArgs, TOutput>
