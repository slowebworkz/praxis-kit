import { isVNode } from 'vue'
import type { Slots, VNode } from 'vue'

export interface NormalizedChildren {
  vnodes: VNode[]
  // How many items from the raw slot output were dropped because they were not VNodes.
  discarded: number
}

// A slot function can return non-VNode values (bare strings/numbers/objects from a render
// function or JSX); `isVNode` filters those out and reports them as `discarded`. The kept list
// is *all* VNodes — element, component, and also Text / Comment (`v-if="false"`) / Fragment —
// because the contract evaluator is meant to see text and structural nodes. The asChild path
// narrows further to element/component vnodes via `isElementVNode` (see `render.ts`).
export function normalizeChildren(slots: Slots): NormalizedChildren {
  const raw = slots.default?.() ?? []
  const vnodes = raw.filter(isVNode)
  return { vnodes, discarded: raw.length - vnodes.length }
}
