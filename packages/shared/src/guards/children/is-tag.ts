import { isObject } from '@praxis-kit/primitive'
import { isString } from '../foundational/is-string'
import { COMPONENT_DEFAULT_TAG } from './component-id'

function resolveChildTag(child: unknown): string | undefined {
  if (!isObject(child) || !('type' in child)) return undefined
  const t = (child as { type: unknown }).type
  // Native element — type is already the tag string.
  if (isString(t)) return t
  // Praxis-kit component — resolve `as ?? defaultTag`, mirroring resolveTag at render time.
  if (isObject(t) && COMPONENT_DEFAULT_TAG in t) {
    const defaultTag = (t as Record<typeof COMPONENT_DEFAULT_TAG, unknown>)[COMPONENT_DEFAULT_TAG]
    if (!isString(defaultTag)) return undefined
    const props = (child as { props?: unknown }).props
    const as = isObject(props) && 'as' in props ? (props as { as: unknown }).as : undefined
    return isString(as) ? as : defaultTag
  }
  return undefined
}

/**
 * Returns a predicate that matches vnodes for any of the given intrinsic tag names.
 * Matches native elements directly, and praxis-kit components by resolving
 * `as ?? defaultTag` — the same logic used at render time.
 */
export function isTag(...tags: readonly string[]): (child: unknown) => child is { type: string } {
  const set = new Set(tags)
  return (child): child is { type: string } => {
    const tag = resolveChildTag(child)
    return tag !== undefined && set.has(tag)
  }
}
