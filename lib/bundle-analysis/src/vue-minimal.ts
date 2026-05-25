/**
 * Claim: the Vue adapter's minimal footprint matches React's — same core
 * runtime, different renderer. Comparing vue-minimal vs react-minimal
 * isolates the per-framework adapter overhead.
 */
import { createPolymorphicComponent } from '@polymorphic-ui/vue'

export const Box = createPolymorphicComponent({ tag: 'div', name: 'Box' })
