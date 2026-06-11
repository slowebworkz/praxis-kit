import { isObject } from '@praxis-kit/primitive'
import { isString } from '../foundational/is-string'

/** Returns true when `child` is a vnode whose type is a string (intrinsic element). */
function hasStringType(child: unknown): child is { type: string } {
  return isObject(child) && 'type' in child && isString((child as { type: unknown }).type)
}

/**
 * Returns a predicate that matches vnodes for any of the given intrinsic tag names.
 * Useful for child rule `match` fields and custom child validators.
 *
 * Note: only matches native element tags ('img', 'div', etc.). Wrapped components
 * whose type is a function are not matched — use isComponent for those.
 */
export function isTag(...tags: readonly string[]): (child: unknown) => child is { type: string } {
  const set = new Set(tags)
  return (child): child is { type: string } => hasStringType(child) && set.has(child.type)
}
