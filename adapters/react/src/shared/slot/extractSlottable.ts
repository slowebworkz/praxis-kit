import { createElement, Fragment, isValidElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { invariant } from './invariant'
import { isSlottableElement } from './predicates'

export interface SlottableExtraction {
  child: ReactElement
  rebuild(merged: ReactElement): ReactElement
}

export function extractSlottable(children: ReactNode): SlottableExtraction | null {
  const childrenArray = Array.isArray(children) ? children : [children]

  const slottables = childrenArray.filter(isSlottableElement)

  invariant(slottables.length <= 1, 'Slot: multiple Slottable children are not allowed')

  if (slottables.length === 0) {
    return null
  }

  const [slottable] = slottables
  invariant(slottable, 'Missing Slottable element')
  const child = slottable.props.children

  invariant(
    child !== null && child !== undefined,
    'Slottable expects exactly one React element child, received null',
  )
  invariant(
    typeof child !== 'string' && typeof child !== 'number',
    'Slottable expects exactly one React element child, received text content',
  )
  invariant(isValidElement(child), 'Slottable expects exactly one React element child')
  invariant(child.type !== Fragment, 'Slottable child cannot be a Fragment')

  const index = childrenArray.indexOf(slottable)

  return {
    child,

    // Fragment wrapper: Slot owns no DOM node; ref composition happens only on the merge target.
    rebuild(merged) {
      const out = childrenArray.map((node, i) => (i === index ? merged : node))
      return createElement(Fragment, null, ...out)
    },
  }
}
