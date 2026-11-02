// Internal helpers shared by the conformance suites. Not part of the package's public surface
// (see index.ts) — suites import from here directly.

import { expectContains } from '@praxis-kit/test-utils'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from './types'

export { expectContains, withWarnSpy } from '@praxis-kit/test-utils'

// `expectContains` under the name that says what it is checking, for class strings.
export const expectClassNames: typeof expectContains = expectContains

// Binds an adapter's `createComponent` to silent diagnostics, for suites where only the rendered
// output is under test. Any `enforcement` the caller passes is kept; only `diagnostics` is set.
export function silentCreate<C extends ConformanceComponent>(adapter: {
  createComponent(options: ConformanceFactoryOptions): C
}): (options?: ConformanceFactoryOptions) => C {
  return (options = {}) =>
    adapter.createComponent({
      ...options,
      enforcement: { ...options.enforcement, diagnostics: silentDiagnostics },
    })
}

export const tagOf = (element: Element): string => element.tagName.toLowerCase()

// A child-rule matcher that accepts every child, so a rule exercises cardinality alone.
export const matchAnyChild = (c: unknown): c is unknown => !!c || !c

// The conformance suite's capability defaults: everything on except composition styling and
// dynamic child rules, which an adapter opts in to. Shared so the split-out sections agree.
export function resolveConformanceCapabilities(adapter: Pick<ConformanceAdapter, 'capabilities'>) {
  return {
    asChild: true,
    compose: true,
    compositionStyling: false,
    tagPolymorphism: true,
    domPropFiltering: true,
    dynamicChildRules: false,
    ...adapter.capabilities,
  }
}

export type ConformanceCaps = ReturnType<typeof resolveConformanceCapabilities>
