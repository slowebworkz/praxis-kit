import { Children, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

// Children.toArray is the appropriate API for React 18 and traverses <Fragment>
// boundaries, unlike the current/ implementation which uses plain array ops.
export function normalizeChildren(children: unknown): ReactElement[] {
  return Children.toArray(children as ReactNode).filter(isValidElement)
}
