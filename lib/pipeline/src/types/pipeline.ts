import type { MergeStrategy } from './merge-strategy'
import type { PipelineNode } from './pipeline-node'
import type { PipelineStrategy } from './primitives'

export interface Pipeline<TContext> {
  readonly name: string
  readonly strategy: PipelineStrategy
  readonly merge: MergeStrategy<TContext>
  readonly nodes: ReadonlyMap<string, PipelineNode<TContext>>
}
