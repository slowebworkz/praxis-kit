/**
 * Claim: a component with createTailwindPipeline retains the Tailwind layout
 * pipeline on top of the base class pipeline. Comparing with react-variants
 * shows the marginal cost of the tailwind adapter.
 */
import { createContractComponent } from '@polymorphic-ui/react'
import type { EmptyRecord } from '@polymorphic-ui/core'
import { createTailwindPipeline } from '@polymorphic-ui/tailwind'

const variants = {
  direction: { row: 'flex-row', col: 'flex-col' },
  gap: { none: 'gap-0', sm: 'gap-2', md: 'gap-4', lg: 'gap-8' },
  align: { start: 'items-start', center: 'items-center', end: 'items-end' },
} as const

export const Box = createContractComponent<'div', EmptyRecord, typeof variants>({
  tag: 'div',
  name: 'Box',
  styling: {
    plugin: createTailwindPipeline,
    variants,
    presets: {
      row: { direction: 'row', align: 'center', gap: 'md' },
      stack: { direction: 'col', gap: 'sm' },
    },
  },
})
