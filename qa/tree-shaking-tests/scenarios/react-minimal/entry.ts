/**
 * Claim: a minimal React component retains only the React adapter and render primitive.
 * No Vue, Solid, Preact, or Svelte adapter code appears in this bundle.
 */
import { createContractComponent } from '@praxis-kit/react'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
