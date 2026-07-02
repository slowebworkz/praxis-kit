// Full React render-cycle benchmarks — reconciliation, memo invalidation, and
// asChild merge overhead. Excludes factory cost (all runtimes at module level).
// Requires jsdom: run via `pnpm bench:render` (vitest.render.bench.config.ts).
//
// Key question answered: does asChild's cloneElement+mergeProps cost matter in
// the full React reconciliation cycle, or is it swamped by reconciler work?
// This informs whether a compiler transform (asChild → render-prop) is worth
// building before the slot contract stabilizes.
import { bench, describe } from 'vitest'
import { createElement, memo } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createContractComponent } from '@praxis-kit/react'
import type { AnyRecord } from '@praxis-kit/core'

// ─── Module-level components — factory cost excluded from all groups ───────────

const Box = createContractComponent({ tag: 'div', name: 'Box' })

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
    compounds: [{ size: 'lg', intent: 'ghost', class: 'btn--lg-ghost' }],
  },
})

const MemoButton = memo(Button)

// Cast for asChild=true: the component is a discriminated union; createElement
// cannot resolve the asChild overload without help. AnyRecord is safe here —
// it's a bench, not user-facing API surface.
const ButtonSlot = Button as ComponentType<AnyRecord>

// ─── Pre-warmed shared roots for re-render groups ──────────────────────────────
// Root creation happens once; subsequent bench iterations measure pure re-render.

function makeRoot() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return createRoot(el)
}

const divReRenderRoot = makeRoot()
const boxReRenderRoot = makeRoot()
const buttonStableRoot = makeRoot()
const buttonRotatingRoot = makeRoot()
const directRoot = makeRoot()
const asChildRoot = makeRoot()

flushSync(() => divReRenderRoot.render(createElement('div', { className: 'box' }, 'text')))
flushSync(() => boxReRenderRoot.render(createElement(Box, null, 'text')))
flushSync(() => buttonStableRoot.render(createElement(Button, { size: 'md' }, 'text')))
flushSync(() => buttonRotatingRoot.render(createElement(Button, { size: 'md' }, 'text')))
flushSync(() => directRoot.render(createElement(Button, { size: 'lg' }, 'Dashboard')))
flushSync(() =>
  asChildRoot.render(
    createElement(
      ButtonSlot,
      { asChild: true, size: 'lg' },
      createElement('a', { href: '/' }, 'Dashboard'),
    ),
  ),
)

// ─── Memo parent fixtures ──────────────────────────────────────────────────────
// Parent re-renders on every iteration (receives a fresh `tick` value).
// Child's memo boundary fires only if its own props differ from the prior render.

const MEMO_SIZES = ['sm', 'md', 'lg'] as const

function MemoParentStable({ tick }: { tick: number }): ReactElement {
  void tick
  return createElement(MemoButton, { size: 'md' }, 'text') as ReactElement
}

function MemoParentRotating({ tick }: { tick: number }): ReactElement {
  return createElement(
    MemoButton,
    { size: MEMO_SIZES[tick % MEMO_SIZES.length]! },
    'text',
  ) as ReactElement
}

const memoStableRoot = makeRoot()
const memoRotatingRoot = makeRoot()
let memoTick = 0

flushSync(() => memoStableRoot.render(createElement(MemoParentStable, { tick: 0 })))
flushSync(() => memoRotatingRoot.render(createElement(MemoParentRotating, { tick: 0 })))

// ─── Rotating props pool (forces LRU cache misses) ────────────────────────────
const SIZES = ['sm', 'md', 'lg'] as const
let rotIdx = 0

// ─── Groups ───────────────────────────────────────────────────────────────────

// Mount: fresh container + createRoot + initial render + unmount per iteration.
// Numbers include reconciler bootstrap cost (fiber tree creation), which is
// excluded from re-render groups. Use re-render groups for steady-state cost.
describe('mount — fresh root per iteration (includes fiber bootstrap)', () => {
  bench('raw div', () => {
    const el = document.createElement('div')
    const root = createRoot(el)
    flushSync(() => root.render(createElement('div', { className: 'box' }, 'text')))
    root.unmount()
  })

  bench('Box (no variants)', () => {
    const el = document.createElement('div')
    const root = createRoot(el)
    flushSync(() => root.render(createElement(Box, null, 'text')))
    root.unmount()
  })

  bench('Button (variants — first render is cold LRU; warms after vitest warmup phase)', () => {
    const el = document.createElement('div')
    const root = createRoot(el)
    flushSync(() => root.render(createElement(Button, { size: 'md' }, 'text')))
    root.unmount()
  })
})

// Re-render: same root, props change. Fiber tree already exists — measures
// only reconciliation + component body cost. LRU cache warms after first iteration.
describe('re-render — shared root, reconciler sees existing fiber tree', () => {
  bench('raw div (className changes)', () => {
    flushSync(() =>
      divReRenderRoot.render(createElement('div', { className: 'box extra' }, 'text')),
    )
  })

  bench('Box — stable props (LRU hit)', () => {
    flushSync(() => boxReRenderRoot.render(createElement(Box, null, 'text')))
  })

  bench('Button — stable variant props (LRU hit)', () => {
    flushSync(() => buttonStableRoot.render(createElement(Button, { size: 'md' }, 'text')))
  })

  bench('Button — rotating variant props (LRU miss each iteration)', () => {
    flushSync(() =>
      buttonRotatingRoot.render(
        createElement(Button, { size: SIZES[rotIdx++ % SIZES.length]! }, 'text'),
      ),
    )
  })
})

// Memo: parent re-renders on every iteration; child skips or re-renders depending
// on whether variant props changed. Confirms memo works correctly across the
// polymorphic component boundary and shows the skip vs re-render cost delta.
describe('React.memo boundary — parent forced re-render, child may skip', () => {
  bench('memo(Button) — stable variant props (child skips)', () => {
    flushSync(() => memoStableRoot.render(createElement(MemoParentStable, { tick: ++memoTick })))
  })

  bench('memo(Button) — rotating variant props (child re-renders)', () => {
    flushSync(() =>
      memoRotatingRoot.render(createElement(MemoParentRotating, { tick: ++memoTick })),
    )
  })
})

// asChild: measures the cloneElement + mergeProps overhead in the full React cycle.
// Key question: does the slot merge cost remain meaningful when reconciler work
// is included, or is it absorbed into reconciler noise?
//
// Interpretation guide:
//   asChild ≈ direct  → merge cost is swamped by reconciler; compiler transform
//                        is ergonomic improvement only, not a performance win yet
//   asChild >> direct → merge cost is significant; compiler transform is a
//                        meaningful optimization worth building
describe('asChild overhead vs direct render (full reconciliation cycle)', () => {
  bench('Button — direct render (no slot merge)', () => {
    flushSync(() => directRoot.render(createElement(Button, { size: 'lg' }, 'Dashboard')))
  })

  bench('Button — asChild=true (cloneElement + mergeProps in component body)', () => {
    flushSync(() =>
      asChildRoot.render(
        createElement(
          ButtonSlot,
          { asChild: true, size: 'lg' },
          createElement('a', { href: '/' }, 'Dashboard'),
        ),
      ),
    )
  })

  bench('raw createElement (theoretical minimum — no polymorphic overhead)', () => {
    flushSync(() =>
      directRoot.render(createElement('a', { href: '/', className: 'btn btn--lg' }, 'Dashboard')),
    )
  })
})
