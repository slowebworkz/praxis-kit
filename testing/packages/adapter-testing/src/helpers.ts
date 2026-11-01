// Internal helpers shared by the conformance suites. Not part of the package's public surface
// (see index.ts) — suites import from here directly.

import { expect } from 'vitest'
import { silentDiagnostics } from '@praxis-kit/diagnostics'
import type { ConformanceComponent, ConformanceFactoryOptions } from './types'

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
