/**
 * Tabs — a compound, stateful component built on praxis-kit.
 *
 * Demonstrates the intended division of labor:
 *   - praxis-kit owns the *contract* layer — tag resolution, ARIA roles, class
 *     pipeline, and structural enforcement (which children are valid, how many).
 *   - a thin React-context layer owns *state/behavior* — the active tab and the
 *     show/hide of panels — which praxis deliberately does not handle.
 *
 * Exposed as a namespaced compound (`Tabs.Root`, `Tabs.List`, `Tabs.Trigger`,
 * `Tabs.Content`, `Tabs.Indicator`). Each sub-component is a context-aware
 * wrapper around a `createContractComponent` factory (except `List`, which needs
 * no state and is a contract component directly).
 *
 *   <Tabs.Root defaultValue="profile">
 *     <Tabs.List>
 *       <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
 *       <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
 *       <Tabs.Indicator />
 *     </Tabs.List>
 *     <Tabs.Content value="profile">…</Tabs.Content>
 *     <Tabs.Content value="settings">…</Tabs.Content>
 *   </Tabs.Root>
 */
import { useId, useState } from 'react'
import type { ReactElement } from 'react'

import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/react'

import { TabsContext, useTabs } from './context'
import type { RootProps, TriggerProps, ContentProps } from './types'

import { isType } from './utils'

// Stable ids wire each trigger to its panel (aria-controls / aria-labelledby).
const tabId = (instanceId: string, value: string) => `${instanceId}-tab-${value}`
const panelId = (instanceId: string, value: string) => `${instanceId}-panel-${value}`

// ── Trigger ─────────────────────────────────────────────────────────────────

const TriggerContract = createContractComponent({
  tag: 'button',
  name: 'TabsTrigger',
  defaults: { type: 'button' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
})
function Trigger({ value, children, ...rest }: TriggerProps): ReactElement {
  const { instanceId, value: active, setValue } = useTabs()
  const selected = active === value
  return (
    <TriggerContract
      id={tabId(instanceId, value)}
      role="tab"
      aria-selected={selected}
      aria-controls={panelId(instanceId, value)}
      data-state={selected ? 'active' : 'inactive'}
      onClick={() => setValue(value)}
      {...rest}
    >
      {children}
    </TriggerContract>
  )
}

// ── Indicator (optional, presentational) ─────────────────────────────────────

const IndicatorContract = createContractComponent({
  tag: 'span',
  name: 'TabsIndicator',
  styling: { base: 'tabs-indicator block h-0.5 bg-blue-600 transition-all' },
})

function Indicator({ className }: { className?: string }): ReactElement {
  // Reads the active value so a real implementation could position itself;
  // here it just exposes it as a data attribute.
  const { value } = useTabs()
  return <IndicatorContract aria-hidden data-active-value={value} className={className} />
}

// ── List (contract only — no state) ──────────────────────────────────────────

const List = createContractComponent({
  tag: 'div',
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
  tag: 'div',
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
})

function Content({ value, children, ...rest }: ContentProps): ReactElement | null {
  const { instanceId, value: active } = useTabs()
  if (active !== value) return null
  return (
    <ContentContract
      id={panelId(instanceId, value)}
      aria-labelledby={tabId(instanceId, value)}
      {...rest}
    >
      {children}
    </ContentContract>
  )
}

// ── Root (state provider + structural contract) ───────────────────────────────

const RootContract = createContractComponent({
  tag: 'div',
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

function Root({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  ...rest
}: RootProps): ReactElement {
  const instanceId = useId()
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '')

  const value = controlledValue ?? uncontrolledValue

  const setValue = (next: string) => {
    if (controlledValue === undefined) {
      setUncontrolledValue(next)
    }

    onValueChange?.(next)
  }

  return (
    <TabsContext.Provider value={{ instanceId, value, setValue }}>
      <RootContract {...rest}>{children}</RootContract>
    </TabsContext.Provider>
  )
}

// ── Namespace ─────────────────────────────────────────────────────────────────
export const Tabs = {
  Root,
  List,
  Trigger,
  Content,
  Indicator,
}
