/**
 * Claim: a purely polymorphic component (no styling, no contract enforcement)
 * retains only the render primitive and React adapter. The ARIA engine and
 * children evaluator must be absent from this bundle.
 *
 * Known limitation (not asserted here): `lib/styling/src/variant-pass` is
 * still bundled even though this component declares no `styling` option —
 * createContractComponent calls buildStylePipeline unconditionally, so the
 * styling code path is always statically reachable regardless of runtime use.
 */
import { createContractComponent } from '@praxis-kit/react'

export const Box = createContractComponent({ tag: 'div', name: 'Box' })
