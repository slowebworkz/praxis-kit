/**
 * Claim: a component with enforcement declared retains AriaPolicyEngine and
 * ChildrenEvaluator. Comparing this bundle against react-minimal shows exactly
 * what enforcement adds in byte cost.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createContractComponent } from '@praxis-ui/react'

const ButtonChild = createContractComponent({ tag: 'button', name: 'ButtonChild' })

export const ButtonGroup = createContractComponent({
  tag: 'div',
  name: 'ButtonGroup',
  enforcement: {
    strict: 'warn',
    children: [
      {
        name: 'Button',
        match: (child: unknown): child is ReactElement =>
          isValidElement(child) && child.type === (ButtonChild as unknown),
        cardinality: { min: 1, max: 6 },
      },
    ],
  },
})
