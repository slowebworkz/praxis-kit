import type { CapabilityMap, Diagnostic, MetadataMap } from '@pk2/pipeline'
import type { ComponentIdentity } from './component-identity'

export interface ComponentContext {
  identity: Partial<ComponentIdentity>
  capabilities: CapabilityMap
  metadata: MetadataMap
  diagnostics: Diagnostic[]
}
