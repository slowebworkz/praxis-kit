/**
 * Claim: a component with children enforcement retains ChildrenEvaluator.
 * No Tailwind pipeline, no other framework adapter should appear.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createContractComponent } from '@praxis-ui/react'

const Item = createContractComponent({ tag: 'li', name: 'Item' })

export const List = createContractComponent({
  tag: 'ul',
  name: 'List',
  enforcement: {
    strict: 'warn',
    children: [
      {
        name: 'Item',
        match: (child: unknown): child is ReactElement =>
          isValidElement(child) && child.type === (Item as unknown),
        cardinality: { min: 1, max: 20 },
      },
    ],
  },
})
