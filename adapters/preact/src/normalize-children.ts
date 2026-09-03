import { isValidElement } from 'preact'
import type { NormalizedChild } from './types/primitives'

// Unlike a `Children.toArray`-style helper this does not traverse `<Fragment>` boundaries — a
// fragment passed as the asChild child is treated as a single element and fails the "exactly one
// element" validation rather than being silently flattened.
//
// Non-empty text/number children are kept alongside elements: this is the only normalizer wired
// into the render pipeline, and it feeds every contract's `enforcement.children` evaluation as
// well as the built-in per-tag HTML content-model contracts — both designed to receive text
// (`labelContract`'s `accessible-name` rule matches a plain string child). The asChild/Slot path
// narrows back to elements itself (see `resolveSlotChildren` in `render.tsx`). Mirrors
// `@praxis-kit/react`'s `normalize-children`.
const isNonEmptyTextChild = (child: unknown): child is string | number =>
  typeof child === 'number' || (typeof child === 'string' && child.trim().length > 0)

export function normalizeChildren(children: unknown): NormalizedChild[] {
  if (isValidElement(children)) return [children as NormalizedChild]
  if (isNonEmptyTextChild(children)) return [children]
  if (Array.isArray(children)) {
    return children.filter(
      (child): child is NormalizedChild => isValidElement(child) || isNonEmptyTextChild(child),
    )
  }
  return []
}
