import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createContractComponent } from '@praxis-kit/react'
import { Button } from '../button/button'

export const ButtonGroup = createContractComponent({
  tag: 'div',
  name: 'ButtonGroup',
  styling: { base: 'inline-flex items-center gap-2' },
  enforcement: {
    strict: 'warn',
    children: [
      {
        name: 'Button',
        match: (child: unknown): child is ReactElement =>
          isValidElement(child) && child.type === Button,
        cardinality: { min: 1, max: 4 },
      },
    ],
  },
})
