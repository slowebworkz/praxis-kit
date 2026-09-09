import type { CapabilityMap, Diagnostic, MetadataMap } from '../pipeline-compat'
import type { ComponentIdentity } from './component-identity'

export interface ComponentContext {
  identity: Partial<ComponentIdentity>
  capabilities: CapabilityMap
  metadata: MetadataMap
  diagnostics: Diagnostic[]
}
