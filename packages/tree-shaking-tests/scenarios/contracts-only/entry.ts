/**
 * Claim: a component with both ARIA and children enforcement retains the full
 * contract runtime (AriaPolicyEngine + ChildrenEvaluator). No Tailwind pipeline,
 * no other framework adapter should appear.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createContractComponent } from '@praxis-ui/react'
import type { AriaRule } from '@praxis-ui/core/contract'

const requireAriaLabel: AriaRule = ({ props }) =>
  'aria-label' in props || 'aria-labelledby' in props
    ? [{ valid: true }]
    : [{ valid: false, severity: 'warning', fixable: false, message: 'Missing accessible label' }]

const Item = createContractComponent({ tag: 'li', name: 'Item' })

export const ButtonGroup = createContractComponent({
  tag: 'ul',
  name: 'ButtonGroup',
  enforcement: {
    strict: 'warn',
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
