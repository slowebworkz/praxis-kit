import type { MaybePromise } from './maybe-promise'
import type { PassResult } from './pass-result'

export interface Pass<TContext> {
  name: string
  execute(context: Readonly<TContext>): MaybePromise<PassResult<TContext>>
}
