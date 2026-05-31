/**
 * Claim: a minimal Preact component retains only the Preact adapter and render primitive.
 * No React, Vue, Solid, or Svelte adapter code appears in this bundle.
 */
import { createContractComponent } from '@praxis-ui/preact'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
