import { Comment, Fragment, Static, Text, isVNode } from 'vue'
import type { VNode } from 'vue'

const NON_ELEMENT_VNODE_TYPES: ReadonlySet<unknown> = new Set([Text, Comment, Static, Fragment])

/**
 * True for a VNode whose `type` targets an element or a component — something `asChild` / Slot
 * can clone props onto.
 *
 * Vue's own `isVNode` also returns `true` for `Text` / `Comment` / `Static` / `Fragment` vnodes
 * (`v-if="false"` renders a `Comment`, interpolated text a `Text`). Those are valid *children*
 * the contract evaluator should see, but they are not valid Slot targets — the asChild path
 * narrows to element/component vnodes with this predicate, the same way the React and Preact
 * adapters narrow their normalized child list back to elements.
 */
export function isElementVNode(value: unknown): value is VNode {
  return isVNode(value) && !NON_ELEMENT_VNODE_TYPES.has(value.type)
}

/** A VNode that renders visible text — dropping one on the asChild path is real content loss. */
export function isTextVNode(value: unknown): value is VNode {
  return isVNode(value) && value.type === Text
}
