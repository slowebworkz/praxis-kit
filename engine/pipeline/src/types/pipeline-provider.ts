import type { Pass } from './pass'
import type { AnyRecord } from '@praxis-kit/primitive'

export interface PipelineProvider<TContext, TOptions = AnyRecord> {
  create(options: TOptions): ReadonlyArray<Pass<TContext>>
}
