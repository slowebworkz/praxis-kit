import type { PipelineNode } from './pipeline-node'
import type { AnyRecord } from '@praxis-kit/primitive'

export interface PipelineProvider<TContext, TOptions = AnyRecord> {
  create(options: TOptions): ReadonlyArray<PipelineNode<TContext>>
}
