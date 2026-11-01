// Internal helpers shared by the conformance suites. Not part of the package's public surface
// (see index.ts) — suites import from here directly.

import { expect, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { ConformanceAdapter, ConformanceComponent, ConformanceFactoryOptions } from './types'

// Asserts that every `has` token is, and every `lacks` token is not, a substring of `text`.
export function expectContains(
  text: string,
  { has = [], lacks = [] }: { has?: readonly string[]; lacks?: readonly string[] },
): void {
  for (const token of has) expect(text).toContain(token)
  for (const token of lacks) expect(text).not.toContain(token)
}

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

// Runs `run` with `console.warn` silenced and always restores it, even if an assertion throws.
export function withWarnSpy(run: (warnSpy: MockInstance<typeof console.warn>) => void): void {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    run(warnSpy)
  } finally {
    warnSpy.mockRestore()
  }
}

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
