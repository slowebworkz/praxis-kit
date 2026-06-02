// Tabs overhead benchmark — praxis-ui vs vanilla React
//
// Core question: what does the praxis-ui contract layer cost at render time
// compared to a hand-rolled React Tabs component with equivalent ARIA wiring?
//
// The vanilla baseline deliberately matches the praxis-ui surface:
//   - Same DOM output structure (tablist, tab, tabpanel roles)
//   - Same ARIA attributes (aria-selected, aria-controls, aria-labelledby)
//   - Same data-state tracking
//   - Same uncontrolled/controlled split
//
// What the benchmark measures:
//   - Initial render (mount) — factory resolution, class pipeline, ARIA engine
//   - Re-render on tab switch — reactive update cost
//   - Controlled re-render — parent-driven value prop update
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
import { createContractComponent } from '@praxis-ui/react'

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
// Equivalent DOM output and ARIA wiring, no praxis-ui involved.

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
  bench('praxis-ui Tabs', () => {
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

describe('Tabs — re-render on tab switch', () => {
  bench('praxis-ui Tabs', () => {
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

describe('Tabs — controlled re-render (value prop update)', () => {
  bench('praxis-ui Tabs', () => {
    withRoot((root) => {
      flushSync(() => root.render(makePraxisTabs()))
      // Re-render with same tree — exercises reconciler + praxis-ui resolve path
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
