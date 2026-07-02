import type { CapabilityMap, Diagnostic, MetadataMap } from '@praxis-kit/pipeline'
import type { ComponentIdentity } from './component-identity'

export interface ComponentContext {
  identity: Partial<ComponentIdentity>
  capabilities: CapabilityMap
  metadata: MetadataMap
  diagnostics: Diagnostic[]
}
