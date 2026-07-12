/**
 * Tabs — compound, stateful component for Vue built on praxis-kit.
 *
 * praxis-kit owns the contract layer (tag resolution, ARIA, classes, structural
 * enforcement). Vue's provide/inject owns active-tab state and show/hide logic.
 *
 *   <Tabs.Root default-value="profile">
 *     <Tabs.List>
 *       <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
 *       <Tabs.Trigger value="settings">Settings</Tabs.Trigger>
 *       <Tabs.Indicator />
 *     </Tabs.List>
 *     <Tabs.Content value="profile">…</Tabs.Content>
 *     <Tabs.Content value="settings">…</Tabs.Content>
 *   </Tabs.Root>
 */
import { defineComponent, ref, computed, h } from 'vue'
import type { Component } from 'vue'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/vue'
import { provideTabsContext, useTabs } from './context'
import { isType, tabId, panelId } from './utils'

// createContractComponent returns a PolymorphicComponent (Volar new() pattern),
// which TypeScript won't accept directly in h(). Casting via Component — the
// type h() actually accepts — is more honest than `as never`.
const toComponent = (c: unknown): Component => c as Component

// ── Trigger ───────────────────────────────────────────────────────────────────

const TriggerContract = createContractComponent({
  tag: 'button' as const,
  name: 'TabsTrigger',
  defaults: { type: 'button' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
})

export const Trigger = defineComponent({
  name: 'TabsTrigger',
  props: { value: { type: String, required: true } },
  setup(props, { slots }) {
    const ctx = useTabs()
    const selected = computed(() => ctx.value === props.value)
    return () =>
      h(
        toComponent(TriggerContract),
        {
          id: tabId(ctx.instanceId, props.value),
          role: 'tab',
          'aria-selected': selected.value,
          'aria-controls': panelId(ctx.instanceId, props.value),
          'data-state': selected.value ? 'active' : 'inactive',
          onClick: () => ctx.setValue(props.value),
        },
        slots,
      )
  },
})

// ── Indicator (presentational) ────────────────────────────────────────────────

const IndicatorContract = createContractComponent({
  tag: 'span' as const,
  name: 'TabsIndicator',
  styling: { base: 'tabs-indicator block h-0.5 bg-blue-600 transition-all' },
})

export const Indicator = defineComponent({
  name: 'TabsIndicator',
  setup(_, { attrs }) {
    const ctx = useTabs()
    return () =>
      h(toComponent(IndicatorContract), {
        'aria-hidden': true,
        'data-active-value': ctx.value,
        ...attrs,
      })
  },
})

// ── List (contract only — no state) ──────────────────────────────────────────

export const List = createContractComponent({
  tag: 'div' as const,
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'relative inline-flex gap-1 border-b border-gray-200' },
  enforcement: {
    diagnostics: warnDiagnostics,
    exclusiveChildren: true,
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

export const Content = defineComponent({
  name: 'TabsContent',
  props: { value: { type: String, required: true } },
  setup(props, { slots }) {
    const ctx = useTabs()
    return () => {
      if (ctx.value !== props.value) return null
      return h(
        toComponent(ContentContract),
        {
          id: panelId(ctx.instanceId, props.value),
          'aria-labelledby': tabId(ctx.instanceId, props.value),
        },
        slots,
      )
    }
  },
})

// ── Root ──────────────────────────────────────────────────────────────────────

const RootContract = createContractComponent({
  tag: 'div' as const,
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
  enforcement: {
    diagnostics: warnDiagnostics,
    exclusiveChildren: true,
    children: [
      { name: 'Tabs.List', match: isType(List), cardinality: { min: 1, max: 1 } },
      { name: 'Tabs.Content', match: isType(Content), cardinality: { min: 1 } },
    ],
  },
})

let _id = 0

export const Root = defineComponent({
  name: 'TabsRoot',
  props: {
    value: { type: String, default: undefined },
    defaultValue: { type: String, default: '' },
    onValueChange: { type: Function, default: undefined },
  },
  setup(props, { slots }) {
    const instanceId = `tabs-${++_id}`
    const uncontrolled = ref(props.defaultValue ?? '')
    const activeValue = computed(() => props.value ?? uncontrolled.value)

    const setValue = (next: string) => {
      if (props.value === undefined) uncontrolled.value = next
      props.onValueChange?.(next)
    }

    provideTabsContext({
      instanceId,
      get value() {
        return activeValue.value
      },
      setValue,
    })

    return () => h(toComponent(RootContract), {}, slots)
  },
})

// ── Namespace ─────────────────────────────────────────────────────────────────
export const Tabs = { Root, List, Trigger, Content, Indicator }
