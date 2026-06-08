import type { EmptyRecord } from '@praxis-kit/core'
import { createContractComponent } from './create-contract-component'

// ─── Box ─────────────────────────────────────────────────────────────────────

const boxVariants = {
  direction: { row: 'flex-row', col: 'flex-col' },
  gap: { sm: 'gap-2', md: 'gap-4', lg: 'gap-8' },
} as const

export const BoxElement = createContractComponent<'div', EmptyRecord, typeof boxVariants>({
  tag: 'div',
  name: 'Box',
  styling: {
    base: 'box-base',
    variants: boxVariants,
    presets: {
      row: { direction: 'row', gap: 'md' },
      column: { direction: 'col', gap: 'lg' },
    },
  },
})

// ─── Button ──────────────────────────────────────────────────────────────────

const buttonVariants = {
  intent: { primary: 'btn-primary', ghost: 'btn-ghost' },
  size: { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' },
} as const

export const ButtonElement = createContractComponent<'button', EmptyRecord, typeof buttonVariants>({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'btn-base',
    variants: buttonVariants,
    defaults: { size: 'md', intent: 'ghost' },
    presets: {
      cta: { intent: 'primary', size: 'lg' },
      subtle: { intent: 'ghost', size: 'sm' },
    },
  },
  enforcement: { strict: 'warn' },
})

// ─── Nav (ARIA exercise) ─────────────────────────────────────────────────────

export const NavElement = createContractComponent({
  tag: 'nav',
  name: 'Nav',
  styling: { base: 'nav-base' },
  enforcement: { strict: 'warn' },
})

// ─── Tabs (children enforcement) ─────────────────────────────────────────────

function isTabsTrigger(child: unknown): child is Element {
  return child instanceof Element && child.tagName.toLowerCase() === 'web-tabs-trigger'
}

function isTabsContent(child: unknown): child is Element {
  return child instanceof Element && child.tagName.toLowerCase() === 'web-tabs-content'
}

export const TabsRootElement = createContractComponent({
  tag: 'div',
  name: 'TabsRoot',
  styling: { base: 'tabs-root' },
  enforcement: {
    strict: 'throw',
    children: [
      { name: 'TabsTrigger', match: isTabsTrigger, cardinality: { min: 1 } },
      { name: 'TabsContent', match: isTabsContent, cardinality: { min: 1 } },
    ],
  },
})

export const TabsTriggerElement = createContractComponent({
  tag: 'button',
  name: 'TabsTrigger',
  styling: { base: 'tabs-trigger' },
})

export const TabsContentElement = createContractComponent({
  tag: 'div',
  name: 'TabsContent',
  styling: { base: 'tabs-content' },
})
