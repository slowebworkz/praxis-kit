import type { Diagnostic, MetadataMap } from '@pk2/pipeline'

export interface PassResult<TContext> {
  context?: Partial<TContext>
  diagnostics?: Diagnostic[]
  metadata?: MetadataMap
}
