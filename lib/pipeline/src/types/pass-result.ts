import type { Diagnostic, MetadataMap } from '@praxis-kit/pipeline'

export interface PassResult<TContext> {
  context?: Partial<TContext>
  diagnostics?: Diagnostic[]
  metadata?: MetadataMap
}
