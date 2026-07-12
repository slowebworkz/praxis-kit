import { isVNode } from 'vue'
import type { VNode } from 'vue'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/vue'
import { Button } from '../button/button'

export const ButtonGroup = createContractComponent({
  tag: 'div',
  name: 'ButtonGroup',
  styling: { base: 'inline-flex items-center gap-2' },
  enforcement: {
    diagnostics: warnDiagnostics,
    exclusiveChildren: true,
    children: [
      {
        name: 'Button',
        match: (child: unknown): child is VNode =>
          isVNode(child) && child.type === (Button as unknown),
        cardinality: { min: 1, max: 4 },
      },
    ],
  },
})
