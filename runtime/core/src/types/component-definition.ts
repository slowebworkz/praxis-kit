import type { CapabilityMap, Diagnostic, MetadataMap } from '@pk2/pipeline'
import type { ComponentIdentity } from './component-identity'

export interface ComponentDefinition {
  identity: ComponentIdentity
  capabilities: CapabilityMap
  metadata: MetadataMap
  diagnostics: Diagnostic[]
}
