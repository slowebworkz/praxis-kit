// Tabs overhead benchmark — praxis-kit vs vanilla React
//
// Core question: what does the praxis-kit contract layer cost at render time
// compared to a hand-rolled React Tabs component with equivalent ARIA wiring?
//
// The vanilla baseline deliberately matches the praxis-kit surface:
//   - Same DOM output structure (tablist, tab, tabpanel roles)
//   - Same ARIA attributes (aria-selected, aria-controls, aria-labelledby)
//   - Same data-state tracking
//   - Same uncontrolled/controlled split
//
// What the benchmark measures:
//   - Initial render (mount) — factory resolution, class pipeline, ARIA engine
//   - Full cycle (mount + tab switch/re-render + unmount) — the two suites below that name
//     themselves this way include root creation and teardown in every iteration; useful as its
//     own number, but not a warm-update measurement
//   - Warm re-render — a root created once, outside any bench callback; the timed callback
//     measures only reconciliation against an existing fiber tree, alternating tabs on every call
//     so React never bails out on a referentially-equal state update
//
// What it does not measure:
//   - GC pressure or allocation rate
//   - React reconciliation depth (both trees are the same shape)
//   - Cold-start factory cost (factories are module-level singletons)
//
// Run via `pnpm bench:render` (vitest.render.bench.config.ts, jsdom).

import { bench, describe } from 'vitest'
import { createElement, useState, useId, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { createContractComponent } from '@praxis-kit/react'

// ─── Praxis-ui Tabs ───────────────────────────────────────────────────────────
// Mirrors examples/react/src/tabs — factories are module-level singletons.

type TabsCtx = { instanceId: string; value: string; setValue(v: string): void }
const TabsContext = createContext<TabsCtx | null>(null)
const useTabs = () => useContext(TabsContext)!

const tabId = (id: string, v: string) => `${id}-tab-${v}`
const panelId = (id: string, v: string) => `${id}-panel-${v}`

const PraxisTriggerBase = createContractComponent({
  tag: 'button' as const,
  name: 'TabsTrigger',
  defaults: { type: 'button' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
})

const PraxisListBase = createContractComponent({
  tag: 'div' as const,
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'relative inline-flex gap-1 border-b border-gray-200' },
})

const PraxisContentBase = createContractComponent({
  tag: 'div' as const,
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
})

const PraxisRootBase = createContractComponent({
  tag: 'div' as const,
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (c: unknown): any => c

function PraxisTrigger({ value, children }: { value: string; children?: ReactNode }) {
  const ctx = useTabs()
  const selected = ctx.value === value
  return createElement(C(PraxisTriggerBase), {
    id: tabId(ctx.instanceId, value),
    role: 'tab',
    'aria-selected': selected,
    'aria-controls': panelId(ctx.instanceId, value),
    'data-state': selected ? 'active' : 'inactive',
    onClick: () => ctx.setValue(value),
    children,
  })
}

function PraxisContent({ value, children }: { value: string; children?: ReactNode }) {
  const ctx = useTabs()
  if (ctx.value !== value) return null
  return createElement(C(PraxisContentBase), {
    id: panelId(ctx.instanceId, value),
    'aria-labelledby': tabId(ctx.instanceId, value),
    children,
  })
}

function PraxisRoot({ defaultValue, children }: { defaultValue: string; children?: ReactNode }) {
  const instanceId = useId()
  const [value, setValue] = useState(defaultValue)
  return createElement(
    TabsContext.Provider,
    { value: { instanceId, value, setValue } },
    createElement(C(PraxisRootBase), {}, children),
  )
}

function makePraxisTabs() {
  return createElement(
    PraxisRoot,
    { defaultValue: 'a' },
    createElement(
      C(PraxisListBase),
      null,
      createElement(PraxisTrigger, { value: 'a' }, 'Tab A'),
      createElement(PraxisTrigger, { value: 'b' }, 'Tab B'),
    ),
    createElement(PraxisContent, { value: 'a' }, 'Panel A'),
    createElement(PraxisContent, { value: 'b' }, 'Panel B'),
  )
}

// ─── Vanilla React Tabs ───────────────────────────────────────────────────────
// Equivalent DOM output and ARIA wiring, no praxis-kit involved.

const VanillaCtx = createContext<TabsCtx | null>(null)
const useVanilla = () => useContext(VanillaCtx)!

function VTrigger({ value, children }: { value: string; children?: ReactNode }) {
  const ctx = useVanilla()
  const selected = ctx.value === value
  return createElement('button', {
    id: tabId(ctx.instanceId, value),
    role: 'tab',
    type: 'button',
    'aria-selected': selected,
    'aria-controls': panelId(ctx.instanceId, value),
    'data-state': selected ? 'active' : 'inactive',
    className:
      'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
    onClick: () => ctx.setValue(value),
    children,
  })
}

function VContent({ value, children }: { value: string; children?: ReactNode }) {
  const ctx = useVanilla()
  if (ctx.value !== value) return null
  return createElement('div', {
    id: panelId(ctx.instanceId, value),
    role: 'tabpanel',
    'aria-labelledby': tabId(ctx.instanceId, value),
    className: 'py-4 text-sm',
    children,
  })
}

function VRoot({ defaultValue, children }: { defaultValue: string; children?: ReactNode }) {
  const instanceId = useId()
  const [value, setValue] = useState(defaultValue)
  return createElement(
    VanillaCtx.Provider,
    { value: { instanceId, value, setValue } },
    createElement('div', { className: 'flex flex-col' }, children),
  )
}

function makeVanillaTabs() {
  return createElement(
    VRoot,
    { defaultValue: 'a' },
    createElement(
      'div',
      { role: 'tablist', className: 'relative inline-flex gap-1 border-b border-gray-200' },
      createElement(VTrigger, { value: 'a' }, 'Tab A'),
      createElement(VTrigger, { value: 'b' }, 'Tab B'),
    ),
    createElement(VContent, { value: 'a' }, 'Panel A'),
    createElement(VContent, { value: 'b' }, 'Panel B'),
  )
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function withRoot(fn: (root: ReturnType<typeof createRoot>, container: HTMLElement) => void) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  try {
    fn(root, container)
  } finally {
    flushSync(() => root.unmount())
    document.body.removeChild(container)
  }
}

// ─── Benchmarks ──────────────────────────────────────────────────────────────

describe('Tabs — initial render (mount)', () => {
  bench('praxis-kit Tabs', () => {
    withRoot((root) => {
      flushSync(() => root.render(makePraxisTabs()))
    })
  })

  bench('vanilla React Tabs (baseline)', () => {
    withRoot((root) => {
      flushSync(() => root.render(makeVanillaTabs()))
    })
  })
})

// Named for what these actually measure — full mount + unmount per iteration, not an isolated
// re-render. withRoot() recreates the container/root/fiber tree every call, so the timed callback
// includes React's mount bootstrap and teardown alongside the click/re-render itself. Useful as its
// own number (a caller who genuinely tears down and remounts on every tab switch would see this),
// but it is not warm-update cost — see the "warm re-render" suite below for that.
describe('Tabs — full cycle: mount + tab switch + unmount (not an isolated re-render)', () => {
  bench('praxis-kit Tabs', () => {
    withRoot((root, container) => {
      flushSync(() => root.render(makePraxisTabs()))
      const triggers = container.querySelectorAll('[role="tab"]')
      flushSync(() => (triggers[1] as HTMLElement).click())
    })
  })

  bench('vanilla React Tabs (baseline)', () => {
    withRoot((root, container) => {
      flushSync(() => root.render(makeVanillaTabs()))
      const triggers = container.querySelectorAll('[role="tab"]')
      flushSync(() => (triggers[1] as HTMLElement).click())
    })
  })
})

describe('Tabs — full cycle: mount + re-render + unmount (not an isolated re-render)', () => {
  bench('praxis-kit Tabs', () => {
    withRoot((root) => {
      flushSync(() => root.render(makePraxisTabs()))
      // Re-render with same tree — exercises reconciler + praxis-kit resolve path
      flushSync(() => root.render(makePraxisTabs()))
    })
  })

  bench('vanilla React Tabs (baseline)', () => {
    withRoot((root) => {
      flushSync(() => root.render(makeVanillaTabs()))
      flushSync(() => root.render(makeVanillaTabs()))
    })
  })
})

// ─── Genuinely warm re-render ───────────────────────────────────────────────────
//
// The two suites above bracket every iteration with root creation and teardown — the number they
// report is a full lifecycle cost, not an isolated update. These roots are created once, outside
// any bench callback (mirroring pipeline.bench.ts's pattern), so the timed callback measures only
// the update itself: reconciliation against an existing fiber tree, not fiber-tree creation.
//
// Clicking the same already-selected tab would be a no-op re-render (React bails out when setState
// receives a referentially-equal value) — alternating between both triggers on every call guarantees
// a real state change, and therefore a real re-render, on every iteration.

function makeWarmTabsFixture(render: () => ReturnType<typeof createElement>) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  flushSync(() => root.render(render()))
  const triggers = container.querySelectorAll('[role="tab"]')
  let idx = 0
  return {
    clickNext: () => flushSync(() => (triggers[idx++ % 2] as HTMLElement).click()),
  }
}

describe('Tabs — warm re-render (pre-existing root, tab switch alternating)', () => {
  const praxisFixture = makeWarmTabsFixture(makePraxisTabs)
  const vanillaFixture = makeWarmTabsFixture(makeVanillaTabs)

  bench('praxis-kit Tabs', () => {
    praxisFixture.clickNext()
  })

  bench('vanilla React Tabs (baseline)', () => {
    vanillaFixture.clickNext()
  })
})
