import type { MaybePromise } from './primitives'
import type { PassResult } from './pass-result'

/** The fundamental executable unit. A pass is _context-pure_: given a read-only
 *  context it returns a `PassResult` describing what should change and does not
 *  mutate the context it receives — it communicates every state change through
 *  its `PassResult`. (The type cannot enforce full purity; a pass may still log,
 *  fetch, or touch module state.) `execute` may be sync or async (`MaybePromise`)
 *  so the same type covers synchronous runtime passes and async compiler passes. */
export interface Pass<TContext> {
  name: string
  execute(context: Readonly<TContext>): MaybePromise<PassResult<TContext>>
}
