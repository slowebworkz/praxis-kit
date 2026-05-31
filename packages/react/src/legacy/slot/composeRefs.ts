/**
 * Cross-version ref extraction for React 18 elements.
 * React 18 stores ref on `element.ref`; when a React 19-created element is passed in,
 * React attaches a warning getter there instead and keeps the real ref in `element.props.ref`.
 * `getChildRef` detects which location is live and reads from there.
 */
import type { ReactElement, Ref } from 'react'
import { mergeRefs, isFunction, isPlainObject } from '@praxis-ui/react/shared'

type ReactWarningGetter = { isReactWarning?: unknown }
/** A ref value that may be absent — the raw shape before normalizing to `Ref | null`. */
type PossibleRef = Ref<unknown> | null | undefined

/** Returns true when `getter` is React's sentinel warning function — meaning the ref is at the other location. */
function isReactWarningGetter(getter: unknown): getter is ReactWarningGetter {
  return isFunction(getter) && 'isReactWarning' in getter
}

/** Returns true when the property descriptor for `key` on `obj` carries React's warning getter. */
function hasWarningGetter(obj: unknown, key: string): boolean {
  return isPlainObject(obj) && isReactWarningGetter(Object.getOwnPropertyDescriptor(obj, key)?.get)
}

/** Reads ref from `element` itself — the React 18 storage location. */
function getElementRef(element: ReactElement): Ref<unknown> | null {
  const el: unknown = element
  return isPlainObject(el) ? ((el.ref as PossibleRef) ?? null) : null
}

/** Reads ref from `element.props` — the React 19 storage location. */
function getPropsRef(element: ReactElement): Ref<unknown> | null {
  const props: unknown = element.props
  return isPlainObject(props) ? ((props.ref as PossibleRef) ?? null) : null
}

// React 18: ref is a separate element property. Guard against element.ref carrying
// React's warning getter — this happens when a React 19-created element is passed in,
// in which case the real ref lives on element.props.ref instead.
export function getChildRef(element: ReactElement): Ref<unknown> | null {
  return hasWarningGetter(element, 'ref') ? getPropsRef(element) : getElementRef(element)
}

export { mergeRefs as composeRefs }
