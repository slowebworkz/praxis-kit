import type { Diagnostic } from './diagnostic'
import type { MetadataMap } from './primitives'

/** What a pass returns. Every field is optional: a pass that only inspects the
 *  context returns `{}`.
 *
 *  - `context` — a partial patch shallow-merged into the pipeline context by
 *    `mergeContext`: each key present here replaces that key's value wholesale.
 *    A pass never mutates the context it is given.
 *  - `diagnostics` — problems found; carried through, never acted on here.
 *  - `metadata` — free-form data for downstream tooling; not merged into context. */
export interface PassResult<TContext> {
  context?: Partial<TContext>
  diagnostics?: Diagnostic[]
  metadata?: MetadataMap
}
