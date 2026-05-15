import { invariant } from './invariant'

export function validateSingleChild(count: number, componentName?: string): void {
  const prefix = componentName ? `${componentName}: ` : ''
  invariant(count === 1, `${prefix}asChild requires exactly one React element child, got ${count}`)
}
