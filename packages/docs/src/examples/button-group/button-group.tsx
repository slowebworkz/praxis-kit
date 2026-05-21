import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import { Button } from '../button/button'

export const ButtonGroup = createPolymorphicComponent({
  tag: 'div',
  name: 'ButtonGroup',
  styling: { base: 'inline-flex items-center gap-2' },
  enforcement: {
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
