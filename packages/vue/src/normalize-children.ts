import { isVNode } from 'vue'
import type { Slots, VNode } from 'vue'

export interface NormalizedChildren {
  vnodes: VNode[]
  // How many items from the raw slot output were dropped because they were not VNodes.
  discarded: number
}

// Slot functions can return non-VNode values from JSX or raw user-provided content;
// `isVNode` ensures the evaluator and slot protocol receive only element nodes.
export function normalizeChildren(slots: Slots): NormalizedChildren {
  const raw = slots.default?.() ?? []
  const vnodes = raw.filter(isVNode)
  return { vnodes, discarded: raw.length - vnodes.length }
}
