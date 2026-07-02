/**
 * Tabs — compound component for Lit built on praxis-kit.
 *
 * praxis-kit owns the contract layer (class pipeline, children enforcement,
 * ARIA). Tab selection state is managed via a CustomEvent protocol between
 * the root and trigger elements — no shadow DOM, no framework context.
 *
 * Usage:
 *   <example-tabs-root>
 *     <example-tabs-list>
 *       <example-tabs-trigger value="a">Tab A</example-tabs-trigger>
 *       <example-tabs-trigger value="b">Tab B</example-tabs-trigger>
 *     </example-tabs-list>
 *     <example-tabs-content value="a">Panel A</example-tabs-content>
 *     <example-tabs-content value="b">Panel B</example-tabs-content>
 *   </example-tabs-root>
 */
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/lit'

// ── Trigger ───────────────────────────────────────────────────────────────────

export const TabsTrigger = createContractComponent({
  tag: 'button',
  name: 'TabsTrigger',
  defaults: { type: 'button', role: 'tab' },
  styling: {
    base: 'px-3 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600',
  },
  enforcement: { diagnostics: warnDiagnostics },
})

// ── Content ───────────────────────────────────────────────────────────────────

export const TabsContent = createContractComponent({
  tag: 'div',
  name: 'TabsContent',
  defaults: { role: 'tabpanel' },
  styling: { base: 'py-4 text-sm' },
  enforcement: { diagnostics: warnDiagnostics },
})

// ── List ──────────────────────────────────────────────────────────────────────

function isTabsTrigger(child: unknown): child is Element {
  return child instanceof Element && child.tagName.toLowerCase() === 'example-tabs-trigger'
}

export const TabsList = createContractComponent({
  tag: 'div',
  name: 'TabsList',
  defaults: { role: 'tablist' },
  styling: { base: 'inline-flex gap-1 border-b border-gray-200' },
  enforcement: {
    diagnostics: warnDiagnostics,
    children: [{ name: 'TabsTrigger', match: isTabsTrigger, cardinality: { min: 1 } }],
  },
})

// ── Root ──────────────────────────────────────────────────────────────────────

function isTabsList(child: unknown): child is Element {
  return child instanceof Element && child.tagName.toLowerCase() === 'example-tabs-list'
}

function isTabsContent(child: unknown): child is Element {
  return child instanceof Element && child.tagName.toLowerCase() === 'example-tabs-content'
}

export const TabsRoot = createContractComponent({
  tag: 'div',
  name: 'TabsRoot',
  styling: { base: 'flex flex-col' },
  enforcement: {
    diagnostics: warnDiagnostics,
    children: [
      { name: 'TabsList', match: isTabsList, cardinality: { min: 1, max: 1 } },
      { name: 'TabsContent', match: isTabsContent, cardinality: { min: 1 } },
    ],
  },
})
