// Isolates the class-resolution step for implicit vs explicit default variants.
// No React involved: this calls the same resolveClasses the SSR path uses, so any
// gap here is inside the styling pipeline rather than the component boundary.

import { bench, describe } from 'vitest'
import { createPolymorphic } from '@praxis-kit/core'
import type { AnyRecord } from '@praxis-kit/core'

const variantRuntime = createPolymorphic({
  tag: 'button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    },
    defaults: { size: 'md', intent: 'primary' },
  },
})

const IMPLICIT: AnyRecord = {}
const EXPLICIT_DEFAULTS: AnyRecord = { size: 'md', intent: 'primary' }
const EXPLICIT_NON_DEFAULT: AnyRecord = { size: 'sm', intent: 'ghost' }

describe('defaults trace — resolveClasses only', () => {
  bench('implicit defaults (no variant props)', () => {
    variantRuntime.resolveClasses('button', IMPLICIT)
  })

  bench('explicit defaults (size md, intent primary)', () => {
    variantRuntime.resolveClasses('button', EXPLICIT_DEFAULTS)
  })

  bench('explicit non-default (size sm, intent ghost)', () => {
    variantRuntime.resolveClasses('button', EXPLICIT_NON_DEFAULT)
  })
})
