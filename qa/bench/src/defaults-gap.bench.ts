// Implicit vs explicit default variants, SSR. One case per process (DEFAULTS_CASE),
// so each case gets its own warm-up and the cases don't share JIT state.
import { bench, describe } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createContractComponent } from '@praxis-kit/react'

const Button = createContractComponent({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'btn',
    variants: {
      size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
      intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
    },
    defaults: { size: 'md', intent: 'primary' },
  },
})

const CASE = process.env.DEFAULTS_CASE ?? 'implicit'
const props = (
  CASE === 'implicit'
    ? { type: 'button' as const }
    : { type: 'button' as const, size: 'md' as const, intent: 'primary' as const }
)

describe('defaults gap', () => {
  bench(CASE, () => {
    renderToString(createElement(Button, props, 'Save'))
  })
})
