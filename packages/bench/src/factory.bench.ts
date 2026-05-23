import { bench, describe } from 'vitest'
import { createPolymorphic } from '@polymorphic-ui/core'
import { cva } from 'class-variance-authority'

describe('factory — no variants', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({ tag: 'div', styling: { base: 'box' } })
  })
})

describe('factory — with variants', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: {
          size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        } as const,
        defaults: { size: 'md', intent: 'primary' },
      },
    })
  })

  bench('cva (baseline)', () => {
    cva('btn', {
      variants: {
        size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
        intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
      },
      defaultVariants: { size: 'md', intent: 'primary' },
    })
  })
})

describe('factory — with variants + compounds', () => {
  bench('createPolymorphic', () => {
    createPolymorphic({
      tag: 'button',
      styling: {
        base: 'btn',
        variants: {
          size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
          intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
        } as const,
        defaults: { size: 'md', intent: 'primary' },
        compounds: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
      },
    })
  })

  bench('cva (baseline)', () => {
    cva('btn', {
      variants: {
        size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
        intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
      },
      defaultVariants: { size: 'md', intent: 'primary' },
      compoundVariants: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
    })
  })
})
