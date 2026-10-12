import { COMPONENT_ID } from '@praxis-kit/guards'

export function applyDisplayName(component: object, name: string | undefined): void {
  const displayName = name ?? 'PolymorphicComponent'
  Object.assign(component, {
    displayName,
    [COMPONENT_ID]: Symbol.for(`praxis.component.${displayName}`),
  })
}
