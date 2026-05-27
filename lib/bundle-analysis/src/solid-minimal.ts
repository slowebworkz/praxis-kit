/**
 * Claim: the Solid adapter's minimal footprint matches React's and Vue's —
 * same core runtime, different renderer. Compare against react-minimal and
 * vue-minimal to isolate per-framework overhead.
 */
import { createContractComponent } from '@polymorphic-ui/solid'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
