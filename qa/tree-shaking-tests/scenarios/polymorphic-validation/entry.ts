/**
 * Claim: a component with children enforcement retains ChildrenEvaluator.
 * No Tailwind pipeline, no other framework adapter should appear.
 *
 * Known limitation (not asserted here): `lib/styling/src/variant-pass` is
 * still bundled even though this component declares no `styling` option —
 * see minimal-polymorphic/entry.ts for details.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/react'

const Item = createContractComponent({ tag: 'li', name: 'Item' })

export const List = createContractComponent({
  tag: 'ul',
  name: 'List',
  enforcement: {
    diagnostics: warnDiagnostics,
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
