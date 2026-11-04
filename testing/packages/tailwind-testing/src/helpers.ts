// Helpers shared by the Tailwind parity suites. Suites import them from here directly; only
// `createCountedPlugin` is part of the package's public surface (re-exported by index.ts).

import { expect, vi } from 'vitest'
import { expectContains, withWarnSpy } from '@praxis-kit/test-utils'
import type { ContainsSpec } from '@praxis-kit/test-utils'
import type { ClassPluginFactory } from '@praxis-kit/styling'

// `expectContains` for a raw class string: splits on whitespace and compares whole tokens, so
// `flex` does not match `flex-col`.
export function expectTokens(className: string, spec: ContainsSpec): void {
  expectContains(className.split(/\s+/), spec)
}

/**
 * Splits a rendered class attribute into tokens after asserting it is canonical: no leading,
 * trailing or repeated whitespace (splitting alone would hide those) and no duplicate tokens.
 * Exact ordering is left unasserted, since adapters may merge classes in different orders.
 */
export function tokensOf(className: string): string[] {
  expect(className).not.toMatch(/^\s|\s$|\s{2,}/)
  const tokens = className.split(/\s+/)
  expect(tokens).toEqual([...new Set(tokens)])
  return tokens
}

/**
 * Caller class strings reused as suite inputs. Each carries a flex-only utility, a grid-only
 * utility and a neutral one, so filtering by display family is observable in the result.
 */
export const CALLER_MIXED = 'flex-col grid-cols-3 rounded'
export const CALLER_MIXED_WITH_GAP = 'flex-col grid-cols-3 gap-4 rounded'

export { expectContains, withWarnSpy }

/**
 * Wraps a real plugin factory so a test can count its invocations. A bare `vi.fn(factory)` loses
 * the factory's generic signature and no longer type-checks as a plugin, so the mock stays
 * internal and only the correctly typed `plugin` and a `calls()` reader are exposed.
 */
export function createCountedPlugin(factory: unknown): {
  readonly plugin: ClassPluginFactory
  readonly calls: () => number
} {
  const mock = vi.fn((...args: unknown[]) => (factory as (...rest: unknown[]) => unknown)(...args))
  return { plugin: mock as unknown as ClassPluginFactory, calls: () => mock.mock.calls.length }
}
