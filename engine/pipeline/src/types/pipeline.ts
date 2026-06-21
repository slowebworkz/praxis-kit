import type { MergeStrategy } from '@pk2/merge'
import type { PipelineNode } from './pipeline-node'
import type { PipelineStrategy } from './pipeline-strategy'

export interface Pipeline<TContext> {
  readonly name: string
  readonly strategy: PipelineStrategy
  readonly merge: MergeStrategy<TContext>
  readonly nodes: ReadonlyMap<string, PipelineNode<TContext>>
}
