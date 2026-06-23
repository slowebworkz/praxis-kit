/**
 * Tabs — compound, stateful component for SolidJS built on praxis-kit.
 *
 * Solid's createSignal owns the active-tab state; createContext/useContext
 * propagates it down the tree. praxis-kit owns the contract layer.
 */
import { createSignal, Show } from 'solid-js'
import type { JSX, Component } from 'solid-js'
import { createContractComponent } from '@praxis-kit/solid'
import { TabsContext, useTabs } from './context'
import { tabId, panelId } from './utils'

// Solid requires capitalized identifiers for JSX component elements.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toComponent = <T,>(c: T): Component<any> => c as Component<any>

// ── Trigger ───────────────────────────────────────────────────────────────────

const _TriggerContract = createContractComponent({
  tag: 'button' as const,
  name: 'TabsTrigger',
  defaults: { type: 'button' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
})
const TriggerContract = toComponent(_TriggerContract)

export function Trigger(props: { value: string; children?: JSX.Element }): JSX.Element {
  const ctx = useTabs()
  const selected = () => ctx.value() === props.value
  return (
    <TriggerContract
      id={tabId(ctx.instanceId, props.value)}
      role="tab"
      aria-selected={selected()}
      aria-controls={panelId(ctx.instanceId, props.value)}
      data-state={selected() ? 'active' : 'inactive'}
      onClick={() => ctx.setValue(props.value)}
    >
      {props.children}
    </TriggerContract>
  )
}

// ── Indicator (presentational) ────────────────────────────────────────────────

const _IndicatorContract = createContractComponent({
  tag: 'span' as const,
  name: 'TabsIndicator',
  styling: { base: 'tabs-indicator block h-0.5 bg-blue-600 transition-all' },
})
const IndicatorContract = toComponent(_IndicatorContract)

export function Indicator(props: { class?: string }): JSX.Element {
  const ctx = useTabs()
  return (
    <IndicatorContract aria-hidden={true} data-active-value={ctx.value()} class={props.class} />
  )
}

// ── List (contract only — no state) ──────────────────────────────────────────

export const List = createContractComponent({
  tag: 'div' as const,
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'relative inline-flex gap-1 border-b border-gray-200' },
})

// ── Content ───────────────────────────────────────────────────────────────────

const _ContentContract = createContractComponent({
  tag: 'div' as const,
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
})
const ContentContract = toComponent(_ContentContract)

export function Content(props: { value: string; children?: JSX.Element }): JSX.Element {
  const ctx = useTabs()
  return (
    <Show when={ctx.value() === props.value}>
      <ContentContract
        id={panelId(ctx.instanceId, props.value)}
        aria-labelledby={tabId(ctx.instanceId, props.value)}
      >
        {props.children}
      </ContentContract>
    </Show>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

const _RootContract = createContractComponent({
  tag: 'div' as const,
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
})
const RootContract = toComponent(_RootContract)

let _id = 0

export function Root(props: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: JSX.Element
}): JSX.Element {
  const instanceId = `tabs-${++_id}`
  const [uncontrolled, setUncontrolled] = createSignal(props.defaultValue ?? '')

  const value = () => props.value ?? uncontrolled()

  const setValue = (next: string) => {
    if (props.value === undefined) setUncontrolled(next)
    props.onValueChange?.(next)
  }

  return (
    <TabsContext.Provider value={{ instanceId, value, setValue }}>
      <RootContract>{props.children}</RootContract>
    </TabsContext.Provider>
  )
}

// ── Namespace ─────────────────────────────────────────────────────────────────
export const Tabs = { Root, List, Trigger, Content, Indicator }
