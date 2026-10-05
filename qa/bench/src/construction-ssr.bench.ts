// Contract construction and server-render cost. Runs in Node (no DOM) via
// `pnpm bench`, so it does not need jsdom. Client-side reconciliation is covered
// by the render suites (`pnpm bench:render`).
//
// Four sections, and the cost model they build:
//   raw React  →  reused Praxis component  →  new component per render  →  define + construct + render
//
// Report absolute time AND overhead ratios (Praxis / raw, fresh / reused). Don't
// make performance claims from percentages alone.
//
// Vitest repeats each function many times, so these measure steady-state cost,
// not process/module startup cost.

import { bench, describe } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { createContractComponent } from '@praxis-kit/react'
import { defineContract } from '@praxis-kit/adapter-utils'

const buttonStyling = {
  base: 'btn',
  variants: {
    size: { sm: 'btn--sm', md: 'btn--md', lg: 'btn--lg' },
    intent: { primary: 'btn--primary', ghost: 'btn--ghost' },
  },
  defaults: { size: 'md', intent: 'primary' },
} as const

// Module-level components, built once — the normal, recommended usage.
const Box = createContractComponent({ tag: 'div', name: 'Box' })
const Button = createContractComponent({ tag: 'button', name: 'Button', styling: buttonStyling })

// ─── 1. Contract construction ──────────────────────────────────────────────────

describe('1. contract construction', () => {
  bench('defineContract() — per-call construction', () => {
    defineContract({ tag: 'button', name: 'Button' })
  })

  bench('defineContract() + createContractComponent() — per-call construction', () => {
    createContractComponent(defineContract({ tag: 'button', name: 'Button' }))
  })
})

// ─── 2. Component construction + render (the anti-pattern) ─────────────────────

describe('2. construction inside render', () => {
  bench('new Praxis component (no styling) + render each iteration', () => {
    const LocalBox = createContractComponent({ tag: 'div', name: 'Box' })
    renderToString(createElement(LocalBox, null, 'Save'))
  })

  bench('new Praxis component (with variants) + render each iteration', () => {
    const LocalButton = createContractComponent({
      tag: 'button',
      name: 'Button',
      styling: buttonStyling,
    })
    renderToString(createElement(LocalButton, { size: 'md', intent: 'primary' }, 'Save'))
  })
})

// ─── 3. Reused Praxis component ────────────────────────────────────────────────

describe('3. reused Praxis component', () => {
  bench('createElement — module-level Button (element creation only)', () => {
    createElement(Button, { size: 'md', intent: 'primary' }, 'Save')
  })

  bench('Box (praxis, no variants)', () => {
    renderToString(createElement(Box, { className: 'box' }, 'hello'))
  })

  bench('Button (praxis, default variants)', () => {
    renderToString(createElement(Button, null, 'Save'))
  })

  bench('Button (praxis, explicit non-default variants)', () => {
    renderToString(createElement(Button, { size: 'sm', intent: 'ghost' }, 'Save'))
  })
})

// ─── 4. Raw React SSR baseline ─────────────────────────────────────────────────

describe('4. raw React baseline', () => {
  bench('raw div', () => {
    renderToString(createElement('div', { className: 'box' }, 'hello'))
  })

  bench('raw button (same classes as Button, default variants)', () => {
    renderToString(
      createElement('button', { type: 'button', className: 'btn btn--md btn--primary' }, 'Save'),
    )
  })
})
