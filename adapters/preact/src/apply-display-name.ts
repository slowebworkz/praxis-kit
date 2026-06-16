export function applyDisplayName(component: object, name: string | undefined): void {
  Object.assign(component, { displayName: name ?? 'PolymorphicComponent' })
}
