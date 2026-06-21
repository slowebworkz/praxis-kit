import type { MaybePromise } from './MaybePromise'
import type { PassResult } from './PassResult'

export interface Pass<TContext> {
  name: string
  execute(context: Readonly<TContext>): MaybePromise<PassResult<TContext>>
}
