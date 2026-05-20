import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { createPolymorphicComponent } from '@polymorphic-ui/react'
import { Button } from '../button/button'

export const ButtonGroup = createPolymorphicComponent({
  defaultTag: 'div',
  displayName: 'ButtonGroup',
  baseClassName: 'inline-flex items-center gap-2',
  childRules: [
    {
      name: 'Button',
      match: (child: unknown): child is ReactElement =>
        isValidElement(child) && child.type === Button,
      cardinality: { min: 1, max: 4 },
    },
  ],
})
