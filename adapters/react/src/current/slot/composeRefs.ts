/**
 * Cross-version ref extraction for React 19 elements.
 * React 19 stores ref in `element.props.ref`; when a React 18-created element is passed in,
 * React attaches a warning getter there instead and keeps the real ref on `element.ref`.
 * `getChildRef` detects which location is live and reads from there.
 */
import type { ReactElement, Ref } from 'react'
import { getElementRef, getPropsRef, hasWarningGetter } from '../../shared'

// React 19: ref is a plain prop. Guard against props.ref carrying React's warning
// getter — this happens when a React 18-created element is passed in, in which case
// the real ref lives on element.ref instead.
export function getChildRef(element: ReactElement): Ref<unknown> | null {
  return hasWarningGetter(element.props, 'ref') ? getElementRef(element) : getPropsRef(element)
}

export { composeRefs } from '../../shared'
