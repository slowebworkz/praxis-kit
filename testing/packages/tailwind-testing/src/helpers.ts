// Helpers shared by the Tailwind parity suites. Suites import them from here directly; only
// `createCountedPlugin` is part of the package's public surface (re-exported by index.ts).

import { expect, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import type { ClassPluginFactory } from '@praxis-kit/styling'

// Asserts that every `has` token is, and every `lacks` token is not, a member of `tokens`.
export function expectTokenList(
  tokens: readonly string[],
  { has = [], lacks = [] }: { has?: readonly string[]; lacks?: readonly string[] },
): void {
  for (const token of has) expect(tokens).toContain(token)
  for (const token of lacks) expect(tokens).not.toContain(token)
}

// As `expectTokenList`, for a raw class string: splits on whitespace and compares whole tokens,
// so `flex` does not match `flex-col`.
export function expectTokens(
  className: string,
  spec: { has?: readonly string[]; lacks?: readonly string[] },
): void {
  expectTokenList(className.split(/\s+/), spec)
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

// Runs `run` with `console.warn` silenced and always restores it, even if an assertion throws.
export async function withWarnSpy(
  run: (warn: MockInstance<typeof console.warn>) => void | Promise<void>,
): Promise<void> {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    await run(warn)
  } finally {
    warn.mockRestore()
  }
}

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
