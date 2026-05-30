/**
 * Claim: a purely polymorphic component (no styling, no contract enforcement)
 * retains only the render primitive and React adapter. The ARIA engine,
 * children evaluator, and class pipeline must all be absent from this bundle.
 */
import { createPolymorphicComponent } from '@praxis-ui/react'

export const Box = createPolymorphicComponent({ tag: 'div', name: 'Box' })
