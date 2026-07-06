/**
 * Cross-version ref extraction for React 18 elements.
 * React 18 stores ref on `element.ref`; when a React 19-created element is passed in,
 * React attaches a warning getter there instead and keeps the real ref in `element.props.ref`.
 * `getChildRef` detects which location is live and reads from there.
 */
import type { ReactElement, Ref } from 'react'
import { getElementRef, getPropsRef, hasWarningGetter } from '../../shared'

// React 18: ref is a separate element property. Guard against element.ref carrying
// React's warning getter — this happens when a React 19-created element is passed in,
// in which case the real ref lives on element.props.ref instead.
export function getChildRef(element: ReactElement): Ref<unknown> | null {
  return hasWarningGetter(element, 'ref') ? getPropsRef(element) : getElementRef(element)
}

export { composeRefs } from '../../shared'
