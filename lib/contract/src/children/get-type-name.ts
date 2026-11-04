import { isFunction, isNull, isObject, isString, isUndefined } from '@praxis-kit/guards'

export function getTypeName(value: unknown): string {
  if (isNull(value)) return 'null'
  if (isUndefined(value)) return 'undefined'
  // Remaining primitives and functions: 'string', 'number', 'function', ...
  if (!isObject(value)) return typeof value

  // React/Preact/Vue element nodes are object wrappers. Report the element
  // type (`a`, `div`, or a component name), not the wrapper's generic `Object`.
  const { type: elementType } = value as { type?: unknown }
  if (isString(elementType)) return elementType
  if (isFunction(elementType)) {
    const component: { displayName?: string; name?: string } = elementType
    return component.displayName ?? component.name ?? 'component'
  }

  const name = value.constructor?.name
  return isString(name) && name !== 'Object' ? name : 'object'
}
