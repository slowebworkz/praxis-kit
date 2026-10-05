// Residual check: where does a fresh component's extra cost come from?
// A  construct only            B  reused render
// C  fresh construct + 1st render    D  fresh construct + 1st + 2nd render
// Second-render cost on the same fresh instance = D - C.
import { bench, describe } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createContractComponent } from '@praxis-kit/react'

const styling = {
  base: 'btn',
  variants: {
    size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
    intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
  },
  defaults: { size: 'md', intent: 'primary' },
} as const
const Reused = createContractComponent({ tag: 'button', name: 'Button', styling })
const props = { type: 'button', size: 'md', intent: 'primary' } as const

describe('residual', () => {
  bench('A construct only', () => {
    createContractComponent({ tag: 'button', name: 'Button', styling })
  })
  bench('B reused render', () => {
    renderToString(createElement(Reused, props, 'Save'))
  })
  bench('C fresh construct + 1st render', () => {
    const C = createContractComponent({ tag: 'button', name: 'Button', styling })
    renderToString(createElement(C, props, 'Save'))
  })
  bench('D fresh construct + 1st + 2nd render', () => {
    const C = createContractComponent({ tag: 'button', name: 'Button', styling })
    renderToString(createElement(C, props, 'Save'))
    renderToString(createElement(C, props, 'Save'))
  })
})
