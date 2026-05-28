import { h, Fragment, isValidElement } from 'preact'
import type { AnyVNode } from '../types'
import { invariant } from './invariant'
import { isSlottableElement } from './predicates'

export interface SlottableExtraction {
  child: AnyVNode
  rebuild(merged: AnyVNode): AnyVNode
}

export function extractSlottable(children: unknown): SlottableExtraction | null {
  const childrenArray = Array.isArray(children) ? children : [children]
  const slottables = childrenArray.filter(isSlottableElement)

  invariant(slottables.length <= 1, 'Slot: multiple Slottable children are not allowed')

  if (slottables.length === 0) return null

  const [slottable] = slottables
  invariant(slottable, 'Missing Slottable element')

  const child = (slottable.props as { children?: unknown }).children

  invariant(
    child !== null && child !== undefined,
    'Slottable expects exactly one Preact element child, received null',
  )
  invariant(
    typeof child !== 'string' && typeof child !== 'number',
    'Slottable expects exactly one Preact element child, received text content',
  )
  invariant(isValidElement(child), 'Slottable expects exactly one Preact element child')
  invariant((child as AnyVNode).type !== Fragment, 'Slottable child cannot be a Fragment')

  const index = childrenArray.indexOf(slottable)

  return {
    child: child as AnyVNode,
    rebuild(merged) {
      const out = childrenArray.map((node, i) => (i === index ? merged : node))
      return h(Fragment, null, ...out)
    },
  }
}
