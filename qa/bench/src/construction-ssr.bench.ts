// Contract construction and server-render cost. Runs in Node (no DOM) via
// `pnpm bench`, so it does not need jsdom. Client-side reconciliation is covered
// by the render suites (`pnpm bench:render`).
//
// Sections and the questions they answer:
//   1. contract construction           — what does defining a component cost?
//   2. fresh component + render         — what does defining one during render cost?
//   3. reused Praxis component          — normal Praxis cost, incl. default vs explicit variants
//   4. raw baselines                    — intrinsic elements vs plain function components
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
const ButtonWithEnforcement = createContractComponent({
  tag: 'button',
  name: 'Button',
  styling: buttonStyling,
  enforcement: { diagnostics: 'warn' },
})

// Plain function components with the same markup as Box and Button. They isolate
// the cost of a component boundary from anything Praxis does inside it.
function RawBox(props: { className?: string; children?: unknown }) {
  return createElement('div', props, props.children as never)
}
function RawButton(props: { className?: string; children?: unknown }) {
  return createElement('button', { type: 'button', ...props }, props.children as never)
}

let elementSink: unknown

// ─── 1. Contract construction ──────────────────────────────────────────────────

describe('1. contract construction', () => {
  bench('defineContract() — per-call construction', () => {
    defineContract({ tag: 'button', name: 'Button' })
  })

  bench('defineContract() + createContractComponent() — per-call construction', () => {
    createContractComponent(defineContract({ tag: 'button', name: 'Button' }))
  })
})

// ─── 2. Fresh component construction + render ──────────────────────────────────
// Models the cost of defining a component during a render rather than benchmarking
// an actual React render callback: each iteration runs createContractComponent
// and then renderToString.

describe('2. fresh component construction + render', () => {
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
    // Stored in a module-level sink so the optimizer can't drop the element creation.
    elementSink = createElement(Button, { size: 'md', intent: 'primary' }, 'Save')
  })

  bench('Box (praxis, no variants)', () => {
    renderToString(createElement(Box, { className: 'box' }, 'hello'))
  })

  bench('Button — implicit defaults (no variant props)', () => {
    renderToString(createElement(Button, { type: 'button' }, 'Save'))
  })

  bench('Button — explicit defaults (size md, intent primary)', () => {
    renderToString(createElement(Button, { type: 'button', size: 'md', intent: 'primary' }, 'Save'))
  })

  bench('Button — explicit non-default variants (size sm, intent ghost)', () => {
    renderToString(createElement(Button, { type: 'button', size: 'sm', intent: 'ghost' }, 'Save'))
  })

  bench('Button with enforcement (diagnostics warn), explicit defaults', () => {
    renderToString(
      createElement(
        ButtonWithEnforcement,
        { type: 'button', size: 'md', intent: 'primary' },
        'Save',
      ),
    )
  })
})

// ─── 4. Raw baselines ──────────────────────────────────────────────────────────

describe('4. raw baselines', () => {
  bench('raw intrinsic div', () => {
    renderToString(createElement('div', { className: 'box' }, 'hello'))
  })

  bench('raw function component (RawBox) wrapping a div', () => {
    renderToString(createElement(RawBox, { className: 'box' }, 'hello'))
  })

  bench('raw intrinsic button (same classes as Button, default variants)', () => {
    renderToString(
      createElement('button', { type: 'button', className: 'btn btn--md btn--primary' }, 'Save'),
    )
  })

  bench('raw function component (RawButton) wrapping a button', () => {
    renderToString(createElement(RawButton, { className: 'btn btn--md btn--primary' }, 'Save'))
  })
})
