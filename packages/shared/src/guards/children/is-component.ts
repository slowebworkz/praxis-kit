import { isObject } from '@praxis-kit/primitive'
import { isString } from '../foundational/is-string'
import { COMPONENT_ID } from './component-id'

type ComponentChild = { type: { [COMPONENT_ID]?: symbol } }

function getComponentId(child: unknown): symbol | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  const t = (child as { type: unknown }).type
  if (!isObject(t) || !(COMPONENT_ID in t)) return undefined
  const id = (t as Record<typeof COMPONENT_ID, unknown>)[COMPONENT_ID]
  return typeof id === 'symbol' ? id : undefined
}

/**
 * Returns a predicate that matches vnodes for praxis-kit components with any of
 * the given identifiers. Each identifier is either:
 *   - a string: resolved to Symbol.for(`praxis.component.${name}`) — matches
 *     components created with that name via createContractComponent
 *   - a symbol: matched directly against the component's COMPONENT_ID value —
 *     useful for custom stable IDs (e.g. Symbol.for('praxis.image'))
 *
 * HOC wrappers (memo, forwardRef, etc.) must explicitly propagate the ID:
 *   Wrapped[COMPONENT_ID] = Original[COMPONENT_ID]
 */
export function isComponent(
  ...ids: ReadonlyArray<string | symbol>
): (child: unknown) => child is ComponentChild {
  const set = new Set(ids.map((id) => (isString(id) ? Symbol.for(`praxis.component.${id}`) : id)))
  return (child): child is ComponentChild => {
    const id = getComponentId(child)
    return id !== undefined && set.has(id)
  }
}
