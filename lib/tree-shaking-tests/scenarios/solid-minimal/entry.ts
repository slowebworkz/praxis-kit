/**
 * Claim: a minimal Solid component retains only the Solid adapter and render primitive.
 * No React, Vue, Preact, or Svelte adapter code appears in this bundle.
 */
import { createContractComponent } from '@praxis-ui/solid'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
