import { isVNode } from 'vue'
import type { VNode } from 'vue'
import { createPolymorphicComponent } from '@polymorphic-ui/vue'
import { Button } from '../button/button'

export const ButtonGroup = createPolymorphicComponent({
  defaultTag: 'div',
  displayName: 'ButtonGroup',
  baseClassName: 'inline-flex items-center gap-2',
  childRules: [
    {
      name: 'Button',
      match: (child: unknown): child is VNode =>
        isVNode(child) && child.type === (Button as unknown),
      cardinality: { min: 1, max: 4 },
    },
  ],
})
