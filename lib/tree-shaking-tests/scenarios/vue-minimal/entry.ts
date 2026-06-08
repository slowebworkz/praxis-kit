/**
 * Claim: a minimal Vue component retains only the Vue adapter and render primitive.
 * No React, Solid, Preact, or Svelte adapter code appears in this bundle.
 */
import { createContractComponent } from '@praxis-kit/vue'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
