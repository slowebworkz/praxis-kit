import { isVNode } from 'vue'
import type { Slots, VNode } from 'vue'

// Slot functions can return non-VNode values from JSX or raw user-provided content;
// `isVNode` ensures the evaluator and slot protocol receive only element nodes.
export function normalizeChildren(slots: Slots): VNode[] {
  const raw = slots.default?.() ?? []
  return raw.filter(isVNode)
}
