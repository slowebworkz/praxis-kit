import { createContractComponent } from '@praxis-kit/web'
import type { EmptyRecord } from '@praxis-kit/core'

const variants = {
  direction: {
    row: 'flex-row',
    col: 'flex-col',
  },
  align: {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  },
  gap: {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-8',
  },
} as const

export const Box = createContractComponent<'div', EmptyRecord, typeof variants>({
  tag: 'div',
  name: 'Box',
  styling: {
    variants,
    presets: {
      row: { direction: 'row', align: 'center', gap: 'md' },
      stack: { direction: 'col', gap: 'sm' },
    },
  },
})
