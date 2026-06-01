import { inject, provide } from 'vue'
import type { InjectionKey } from 'vue'

export type TabsContextValue = {
  instanceId: string
  value: string
  setValue(value: string): void
}

export const TABS_KEY: InjectionKey<TabsContextValue> = Symbol('TabsContext')

export function provideTabsContext(ctx: TabsContextValue): void {
  provide(TABS_KEY, ctx)
}

export function useTabs(): TabsContextValue {
  const ctx = inject(TABS_KEY)
  if (!ctx) throw new Error('Tabs.* components must be rendered inside <Tabs.Root>.')
  return ctx
}
