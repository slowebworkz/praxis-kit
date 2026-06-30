/**
 * Tabs — compound, stateful component for Preact built on praxis-kit.
 *
 * Mirrors the React Tabs example. Preact's createContext/useContext (from
 * preact/compat) owns active-tab state; praxis-kit owns the contract layer.
 */
import { h } from 'preact'
import type { ComponentChildren } from 'preact'
import { useState } from 'preact/hooks'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/preact'
import { TabsContext, useTabs } from './context'
import { isType, tabId, panelId } from './utils'

// ── Trigger ───────────────────────────────────────────────────────────────────

const TriggerContract = createContractComponent({
  tag: 'button' as const,
  name: 'TabsTrigger',
  defaults: { type: 'button' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
})

function Trigger({ value, children }: { value: string; children?: ComponentChildren }) {
  const ctx = useTabs()
  const selected = ctx.value === value
  return h(
    TriggerContract as never,
    {
      id: tabId(ctx.instanceId, value),
      role: 'tab',
      'aria-selected': selected,
      'aria-controls': panelId(ctx.instanceId, value),
      'data-state': selected ? 'active' : 'inactive',
      onClick: () => ctx.setValue(value),
    },
    children,
  )
}

// ── Indicator (presentational) ────────────────────────────────────────────────

const IndicatorContract = createContractComponent({
  tag: 'span' as const,
  name: 'TabsIndicator',
  styling: { base: 'tabs-indicator block h-0.5 bg-blue-600 transition-all' },
})

function Indicator({ class: cls }: { class?: string }) {
  const ctx = useTabs()
  return h(IndicatorContract as never, {
    'aria-hidden': true,
    'data-active-value': ctx.value,
    ...(cls !== undefined && { class: cls }),
  })
}

// ── List (contract only — no state) ──────────────────────────────────────────

const List = createContractComponent({
  tag: 'div' as const,
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'relative inline-flex gap-1 border-b border-gray-200' },
  enforcement: {
    diagnostics: warnDiagnostics,
    children: [
      { name: 'Tabs.Trigger', match: isType(Trigger), cardinality: { min: 1 } },
      { name: 'Tabs.Indicator', match: isType(Indicator), cardinality: { max: 1 } },
    ],
  },
})

// ── Content ───────────────────────────────────────────────────────────────────

const ContentContract = createContractComponent({
  tag: 'div' as const,
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
})

function Content({ value, children }: { value: string; children?: ComponentChildren }) {
  const ctx = useTabs()
  if (ctx.value !== value) return null
  return h(
    ContentContract as never,
    {
      id: panelId(ctx.instanceId, value),
      'aria-labelledby': tabId(ctx.instanceId, value),
    },
    children,
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

const RootContract = createContractComponent({
  tag: 'div' as const,
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
  enforcement: {
    diagnostics: warnDiagnostics,
    children: [
      { name: 'Tabs.List', match: isType(List), cardinality: { min: 1, max: 1 } },
      { name: 'Tabs.Content', match: isType(Content), cardinality: { min: 1 } },
    ],
  },
})

let _id = 0

function Root({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: ComponentChildren
}) {
  const instanceId = `tabs-${++_id}`
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? '')

  const value = controlledValue ?? uncontrolled

  const setValue = (next: string) => {
    if (controlledValue === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }

  return h(
    TabsContext.Provider,
    { value: { instanceId, value, setValue } },
    h(RootContract as never, {}, children),
  )
}

// ── Namespace ─────────────────────────────────────────────────────────────────
export const Tabs = { Root, List, Trigger, Content, Indicator }
