import { createContext, useContext } from 'solid-js'

export type TabsContextValue = {
  instanceId: string
  value: () => string
  setValue(value: string): void
}

export const TabsContext = createContext<TabsContextValue | null>(null)

export function useTabs(): TabsContextValue {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs.* components must be rendered inside <Tabs.Root>.')
  return ctx
}
