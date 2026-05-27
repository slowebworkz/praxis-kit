/**
 * Claim: the Vue adapter's minimal footprint matches React's — same core
 * runtime, different renderer. Comparing vue-minimal vs react-minimal
 * isolates the per-framework adapter overhead.
 */
import { createContractComponent } from '@polymorphic-ui/vue'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
