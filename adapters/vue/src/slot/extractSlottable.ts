import { h, Fragment } from 'vue'
import type { Slots, VNode } from 'vue'
import { invariant } from './invariant'
import { Slottable } from './Slottable'

export interface SlottableExtraction {
  child: VNode
  rebuild(merged: VNode): VNode
}

function isSlottableVNode(vnode: VNode): boolean {
  return vnode.type === Slottable
}

export function extractSlottable(children: VNode[]): SlottableExtraction | null {
  const slottables = children.filter(isSlottableVNode)

  invariant(slottables.length <= 1, 'Slot: multiple Slottable children are not allowed')

  if (slottables.length === 0) return null

  const [slottable] = slottables
  invariant(slottable !== undefined, 'Slottable element is undefined')

  const slots = slottable.children as Slots | null
  const defaultChildren = slots?.default?.() ?? []

  invariant(
    defaultChildren.length === 1,
    `Slottable expects exactly one VNode child, received ${defaultChildren.length}`,
  )

  const child = defaultChildren[0]
  invariant(child !== undefined, 'Slottable child is undefined')

  const index = children.indexOf(slottable)

  return {
    child,
    rebuild(merged: VNode): VNode {
      const out = children.map((node, i) => (i === index ? merged : node))
      return h(Fragment, null, out)
    },
  }
}
