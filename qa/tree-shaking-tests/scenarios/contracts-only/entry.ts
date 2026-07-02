/**
 * Claim: a component with both ARIA and children enforcement retains the full
 * contract runtime (AriaPolicyEngine + ChildrenEvaluator). No Tailwind pipeline,
 * no other framework adapter should appear.
 *
 * Known limitation (not asserted here): `lib/styling/src/variant-pass` is
 * still bundled even though this component declares no `styling` option —
 * see minimal-polymorphic/entry.ts for details.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/react'
import type { AriaRule } from '@praxis-kit/core/contract'

const requireAriaLabel: AriaRule = ({ props }) =>
  'aria-label' in props || 'aria-labelledby' in props
    ? [{ valid: true }]
    : [{ valid: false, severity: 'warning', fixable: false, message: 'Missing accessible label' }]

const Item = createContractComponent({ tag: 'li', name: 'Item' })

export const ButtonGroup = createContractComponent({
  tag: 'ul',
  name: 'ButtonGroup',
  enforcement: {
    diagnostics: warnDiagnostics,
    aria: [requireAriaLabel],
    children: [
      {
        name: 'Item',
        match: (child: unknown): child is ReactElement =>
          isValidElement(child) && child.type === (Item as unknown),
        cardinality: { min: 1, max: 10 },
      },
    ],
  },
})
