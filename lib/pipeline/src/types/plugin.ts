import type { Processor } from './processor'

export interface Plugin<TContext> {
  name: string
  create(): ReadonlyArray<Processor<TContext>>
}
