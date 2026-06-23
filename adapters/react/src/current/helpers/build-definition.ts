import type { ComponentDefinition } from '@pk2/core'

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
