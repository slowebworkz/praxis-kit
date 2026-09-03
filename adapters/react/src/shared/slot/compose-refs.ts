/**
 * React compatibility helpers.
 *
 * React 18 and React 19 expose element refs from different locations. These
 * helpers provide a stable API for reading refs without exposing those version
 * differences to the rest of the implementation.
 *
 * Version-specific `composeRefs` implementations determine which location to
 * check first for their target React version, falling back to the alternate
 * location when necessary.
 */
import type { ReactElement } from 'react'
import { mergeRefs } from '../merge-refs'
import { isFunction, isPlainObject } from './predicates'
import type { NormalizedRef, PossibleRef, ReactWarningGetter } from '../types'

export { mergeRefs as composeRefs }

/** Returns `true` when `getter` is React's internal sentinel warning getter. */
function isReactWarningGetter(getter: unknown): getter is ReactWarningGetter {
  return isFunction(getter) && 'isReactWarning' in getter
}

/**
 * Returns `true` when `obj[key]` is backed by React's sentinel warning getter,
 * indicating the actual ref is stored on the alternate location.
 */
export function hasWarningGetter(obj: unknown, key: string): boolean {
  return isPlainObject(obj) && isReactWarningGetter(Object.getOwnPropertyDescriptor(obj, key)?.get)
}

/** Reads the element-level ref (the React 18 storage location). */
export function getElementRef(element: ReactElement): NormalizedRef {
  const el: unknown = element
  return isPlainObject(el) ? ((el.ref as PossibleRef) ?? null) : null
}

/** Reads the props-level ref (the React 19 storage location). */
export function getPropsRef(element: ReactElement): NormalizedRef {
  const props: unknown = element.props
  return isPlainObject(props) ? ((props.ref as PossibleRef) ?? null) : null
}
