import { getContext, setContext } from 'svelte'

const TABS_KEY = Symbol('TabsContext')

export type TabsContextValue = {
  instanceId: string
  value: () => string
  setValue(value: string): void
}

export function setTabsContext(ctx: TabsContextValue): void {
  setContext(TABS_KEY, ctx)
}

export function getTabsContext(): TabsContextValue {
  const ctx = getContext<TabsContextValue | undefined>(TABS_KEY)
  if (!ctx) throw new Error('Tabs.* components must be rendered inside <Tabs.Root>.')
  return ctx
}
