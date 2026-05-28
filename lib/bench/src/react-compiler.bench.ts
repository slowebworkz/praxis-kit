// React Compiler output benchmarks — asChild boundary analysis
//
// Core question: can React Compiler transforms eliminate cloneElement/closure
// allocation across the asChild boundary?
//
// What the compiler CAN do:
//   (a) Hoist stable child elements at the call site — avoids re-allocating the
//       child element object when href/text are stable values.
//   (b) Memoize an entire subtree when all inputs are stable — equivalent to
//       React.memo applied by the compiler transitively.
//
// What the compiler CANNOT do:
//   (c) Optimize through the Slot component boundary. cloneElement and mergeProps
//       run inside Slot's body on every Slot render, regardless of whether the
//       child argument carries the same object reference.
//
// Expected findings:
//   (a) child stability → no reduction in asChild render cost. Same-reference
//       child still causes Slot to call cloneElement + mergeProps on every render.
//   (b) memo boundary + stable inputs → Button body is skipped entirely. This IS
//       a meaningful win, but it is React.memo — not a compiler transform on the
//       asChild pattern itself.
//   render-prop group shows the maximum cloneElement elimination: direct-render
//       and raw createElement set the floor; asChild overhead above that floor
//       is the cost a compile-time slot transform would capture.
//
// Run via `pnpm bench:render` (vitest.render.bench.config.ts, jsdom).

import { bench, describe } from 'vitest'
import { createElement, memo } from 'react'
import type { ComponentType, ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createContractComponent } from '@praxis-ui/react'
import type { AnyRecord } from '@praxis-ui/core'

// ─── Module-level runtimes ────────────────────────────────────────────────────

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

const MemoButton = memo(Button)

// asChild requires bypassing the discriminated-union overloads — same pattern
// as pipeline.bench.ts.
const ButtonSlot = Button as ComponentType<AnyRecord>
const MemoButtonSlot = MemoButton as ComponentType<AnyRecord>

// ─── Stable child — module-level ─────────────────────────────────────────────
// Simulates the output of React Compiler's call-site hoisting: when `href` is
// a stable (non-state) value, the compiler replaces:
//   createElement('a', { href: '/' }, 'Dashboard')         // re-allocated each render
// with a module-level cache slot so the same object is reused every render.
const stableChild = createElement('a', { href: '/' }, 'Dashboard')

// ─── Root factory ─────────────────────────────────────────────────────────────

function makeRoot() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return createRoot(el)
}

// ─── Pre-warmed roots (factory + first render excluded from measurements) ─────

const freshChildRoot = makeRoot()
const stableChildRoot = makeRoot()
const directRoot = makeRoot()
const rawRoot = makeRoot()

flushSync(() =>
  freshChildRoot.render(
    createElement(
      ButtonSlot,
      { asChild: true, size: 'lg', intent: 'ghost' },
      createElement('a', { href: '/' }, 'Dashboard'),
    ),
  ),
)
flushSync(() =>
  stableChildRoot.render(
    createElement(ButtonSlot, { asChild: true, size: 'lg', intent: 'ghost' }, stableChild),
  ),
)
flushSync(() =>
  directRoot.render(createElement(Button, { size: 'lg', intent: 'ghost' }, 'Dashboard')),
)
flushSync(() =>
  rawRoot.render(
    createElement('a', { href: '/', className: 'btn btn--lg btn--ghost' }, 'Dashboard'),
  ),
)

// ─── Memo boundary fixtures ───────────────────────────────────────────────────
// Parent re-renders every iteration (receives a new `tick`); Button's props are
// held stable. With memo(Button) the child body is skipped when props are
// referentially equal — the only cost is the parent render + reconciler bailout.

function ParentNoMemo({ tick }: { tick: number }): ReactElement {
  void tick
  return createElement(
    ButtonSlot,
    { asChild: true, size: 'lg', intent: 'ghost' },
    stableChild,
  ) as ReactElement
}

function ParentWithMemo({ tick }: { tick: number }): ReactElement {
  void tick
  return createElement(
    MemoButtonSlot,
    { asChild: true, size: 'lg', intent: 'ghost' },
    stableChild,
  ) as ReactElement
}

const memoParentNoMemoRoot = makeRoot()
const memoParentWithMemoRoot = makeRoot()
let tick = 0

flushSync(() => memoParentNoMemoRoot.render(createElement(ParentNoMemo, { tick: 0 })))
flushSync(() => memoParentWithMemoRoot.render(createElement(ParentWithMemo, { tick: 0 })))

// ─── Groups ───────────────────────────────────────────────────────────────────

// Group 1: child stability
//
// Does hoisting the child element to a stable reference (the compiler's most
// basic optimization) reduce asChild render cost?
//
// The answer is yes — but for the wrong reason. Slot still calls cloneElement
// on every Slot render regardless of whether the child argument is the same
// object reference. The speedup (~2x observed) comes from eliminating the
// call-site allocation: creating a fresh `createElement('a', ...)` each render
// allocates a new object and increases GC pressure; reusing a module-level
// constant avoids that. The cloneElement inside Slot still runs either way.
//
// Implication: React Compiler's call-site hoisting reduces asChild cost by
// cutting allocation pressure, not by skipping the slot merge path. The memo
// boundary (Group 2) is the actual escape hatch for eliminating Slot work.
describe('asChild — effect of child element stability on Slot/cloneElement cost', () => {
  bench('asChild — fresh child element per render (typical uncompiled form)', () => {
    flushSync(() =>
      freshChildRoot.render(
        createElement(
          ButtonSlot,
          { asChild: true, size: 'lg', intent: 'ghost' },
          createElement('a', { href: '/' }, 'Dashboard'),
        ),
      ),
    )
  })

  bench('asChild — stable child reference (simulates compiler call-site hoisting)', () => {
    flushSync(() =>
      stableChildRoot.render(
        createElement(ButtonSlot, { asChild: true, size: 'lg', intent: 'ghost' }, stableChild),
      ),
    )
  })
})

// Group 2: memo boundary as the real escape hatch
//
// With memo(Button) and fully stable inputs, the reconciler skips Button's body
// entirely — Slot never renders, cloneElement never runs. This shows that
// React.memo (not compiler transforms on the asChild pattern) is the actual
// mechanism that eliminates Slot overhead.
describe('React.memo as the asChild escape hatch — body skip vs full render', () => {
  bench('asChild — no memo (Button body runs every parent re-render)', () => {
    flushSync(() => memoParentNoMemoRoot.render(createElement(ParentNoMemo, { tick: ++tick })))
  })

  bench('asChild — memo(Button) + stable props + stable child (Button body skipped)', () => {
    flushSync(() => memoParentWithMemoRoot.render(createElement(ParentWithMemo, { tick: ++tick })))
  })
})

// Group 3: render-prop comparison — quantifying the Slot/cloneElement cost
//
// Shows the maximum cost that a compile-time slot transform (asChild → render-prop)
// would eliminate. The gap between asChild and direct-render is the Slot component
// render + cloneElement + mergeProps + composeRefs overhead in the full
// reconciliation cycle.
describe('render-prop comparison — maximum cost a compile-time slot transform would eliminate', () => {
  bench('asChild — stable child (Slot + cloneElement + mergeProps each render)', () => {
    flushSync(() =>
      stableChildRoot.render(
        createElement(ButtonSlot, { asChild: true, size: 'lg', intent: 'ghost' }, stableChild),
      ),
    )
  })

  bench(
    'direct render — no Slot, same Button runtime (class resolution, prop filter, ARIA)',
    () => {
      flushSync(() =>
        directRoot.render(createElement(Button, { size: 'lg', intent: 'ghost' }, 'Dashboard')),
      )
    },
  )

  bench('raw createElement — theoretical minimum (no polymorphic overhead at all)', () => {
    flushSync(() =>
      rawRoot.render(
        createElement('a', { href: '/', className: 'btn btn--lg btn--ghost' }, 'Dashboard'),
      ),
    )
  })
})
