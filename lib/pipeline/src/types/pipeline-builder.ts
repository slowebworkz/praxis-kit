import type { MergeStrategy } from '@pk2/pipeline'
import type { Pipeline } from './pipeline'
import type { PipelineStrategy } from './primitives'
import type { Plugin } from './plugin'
import type { Processor } from './processor'

export interface PipelineBuildOptions<TContext> {
  name: string
  strategy: PipelineStrategy
  merge: MergeStrategy<TContext>
  plugins?: Plugin<TContext>[]
}

export interface PipelineBuilder<TContext> {
  then(processor: Processor<TContext> | undefined): PipelineBuilder<TContext>
  build(): Pipeline<TContext>
}
