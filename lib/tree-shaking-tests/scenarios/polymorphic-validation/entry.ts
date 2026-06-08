/**
 * Claim: a component with children enforcement retains ChildrenEvaluator.
 * No Tailwind pipeline, no other framework adapter should appear.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createChildrenEnforcedComponent } from '@praxis-kit/react'

const Item = createChildrenEnforcedComponent({ tag: 'li', name: 'Item' })

export const List = createChildrenEnforcedComponent({
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
