import type { UnknownRecord } from 'type-fest'
import type { Pipeline, Arguments } from '../core/types'

/** The constraint every resolved pipeline config must satisfy. `UnknownRecord` rather than a
 *  bare `object`, matching how resolved options are always a keyed record throughout the
 *  codebase — e.g. resolveFactoryOptions's `Object.freeze(...)` return value. */
export type ResolvedConfig = UnknownRecord

/** The shape every createXPipeline factory in the codebase already conforms to — build once
 *  from resolved config, return a Pipeline. createClassPipeline, createResolverPipeline, and a
 *  future createTagPipeline each satisfy this structurally; none needs to call through a shared
 *  runtime wrapper to "be" one. Named so the contract is checkable
 *  (`const createTagPipeline: PipelineFactory<TagOptions, ...> = (resolved) => ...`) instead of
 *  implicit and only recognizable by eyeballing each factory's signature by hand. */
export type PipelineFactory<TResolved extends ResolvedConfig, TArgs extends Arguments, TOutput> = (
  resolved: TResolved,
) => Pipeline<TArgs, TOutput>
