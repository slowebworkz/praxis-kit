import type { CapabilityMap, Diagnostic, MetadataMap } from '../pipeline-compat'
import type { ComponentIdentity } from './component-identity'

export interface ComponentDefinition {
  identity: ComponentIdentity
  capabilities: CapabilityMap
  metadata: MetadataMap
  diagnostics: Diagnostic[]
}
