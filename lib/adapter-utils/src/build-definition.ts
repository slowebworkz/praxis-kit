import type { ComponentDefinition } from '@praxis-kit/runtime'

export function buildDefinition(name: string, tag: string): ComponentDefinition {
  return {
    identity: {
      id: name,
      name,
      tag,
    },
    capabilities: {},
    metadata: {},
    diagnostics: [],
  }
}
