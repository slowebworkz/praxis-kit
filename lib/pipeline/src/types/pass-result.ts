import type { Diagnostic } from './diagnostic'
import type { MetadataMap } from './primitives'

export interface PassResult<TContext> {
  context?: Partial<TContext>
  diagnostics?: Diagnostic[]
  metadata?: MetadataMap
}
