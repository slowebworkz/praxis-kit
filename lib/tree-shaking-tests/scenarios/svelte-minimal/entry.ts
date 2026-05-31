/**
 * Claim: a minimal Svelte component retains only the Svelte adapter and render primitive.
 * No React, Vue, Solid, or Preact adapter code appears in this bundle.
 */
import { createContractComponent } from '@praxis-ui/svelte'

export const bundle = createContractComponent({ tag: 'div', name: 'Box' })
