import { createContractComponent } from '@praxis-ui/svelte'

export const triggerBundle = createContractComponent({
  tag: 'button' as const,
  name: 'TabsTrigger',
  defaults: { type: 'button' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
})

export const indicatorBundle = createContractComponent({
  tag: 'span' as const,
  name: 'TabsIndicator',
  styling: { base: 'tabs-indicator block h-0.5 bg-blue-600 transition-all' },
})

export const listBundle = createContractComponent({
  tag: 'div' as const,
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'relative inline-flex gap-1 border-b border-gray-200' },
})

export const contentBundle = createContractComponent({
  tag: 'div' as const,
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
})

export const rootBundle = createContractComponent({
  tag: 'div' as const,
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
})
