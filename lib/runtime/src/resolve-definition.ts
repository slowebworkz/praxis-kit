import type { ComponentContext, ComponentDefinition, ComponentIdentity } from './types'

export function isCompleteIdentity(
  identity: Partial<ComponentIdentity>,
): identity is ComponentIdentity {
  return identity.id !== undefined && identity.name !== undefined && identity.tag !== undefined
}

export function resolveDefinition(context: ComponentContext): ComponentDefinition | null {
  if (!isCompleteIdentity(context.identity)) {
    return null
  }

  return {
    identity: context.identity,
    capabilities: context.capabilities,
    metadata: context.metadata,
    diagnostics: context.diagnostics,
  }
}
