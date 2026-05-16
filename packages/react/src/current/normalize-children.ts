import { isValidElement } from 'react'
import type { ReactElement } from 'react'

// React.Children.toArray is deprecated in React 19. Unlike that API, this
// implementation does not traverse <Fragment> boundaries — a fragment passed
// as the asChild child is treated as a single element and will fail the
// "exactly one element" validation rather than being silently flattened.
export function normalizeChildren(children: unknown): ReactElement[] {
  if (isValidElement(children)) return [children]
  if (Array.isArray(children)) return children.filter(isValidElement)
  return []
}
