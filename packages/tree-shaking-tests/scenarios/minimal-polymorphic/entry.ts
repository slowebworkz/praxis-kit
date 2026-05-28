/**
 * Claim: a component with no enforcement and no styling retains only the core
 * render primitive and the React adapter. No Tailwind pipeline, no other
 * framework adapter should appear in this bundle slice.
 */
import { createContractComponent } from '@praxis-ui/react'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
