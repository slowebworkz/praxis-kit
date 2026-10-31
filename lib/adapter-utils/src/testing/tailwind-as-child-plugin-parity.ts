import { describe, expect, it, vi } from 'vitest'
import type { ClassPluginFactory } from '@praxis-kit/styling'

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

export type TailwindAsChildPluginResult = {
  readonly className: string
  readonly flexAttribute: string | null
  /** Partner plugin factory calls after the partner was created, through asChild rendering. */
  readonly partnerFactoryCallsDuringAsChild: number
  /** Primary plugin factory invocations for this render. */
  readonly primaryFactoryCallsDuringAsChild: number
}

export type TailwindAsChildPluginParityAdapter = {
  /** Render a composed component through explicit asChild with its own Tailwind plugin. */
  readonly renderPrimaryPluginAsChild: () =>
    TailwindAsChildPluginResult | Promise<TailwindAsChildPluginResult>
  /** Render two nested explicit asChild components down to a native host element. */
  readonly renderNestedAsChild: () =>
    TailwindAsChildPluginResult | Promise<TailwindAsChildPluginResult>
}

/**
 * Explicit `asChild` is consumer-controlled rendering: the primary component owns the styling
 * pipeline for the slotted host. The declarative `compose.with` partner must not take over that
 * path or contribute its independently-resolved classes.
 *
 * Svelte is intentionally excluded: its adapter currently declares `capabilities.asChild: false`.
 * Lit and Web also do not expose this component-composition/asChild contract.
 */
export function tailwindAsChildPluginParitySuite(adapter: TailwindAsChildPluginParityAdapter): void {
  describe('Tailwind explicit asChild plugin parity', () => {
    it('keeps the primary Tailwind plugin on the explicit asChild path', async () => {
      const result = await adapter.renderPrimaryPluginAsChild()
      const tokens = result.className.split(/\s+/)

      expect(tokens).toContain('primary-base')
      expect(tokens).toContain('caller-class')
      expect(tokens).toContain('child-class')
      expect(tokens).toContain('flex')
      expect(tokens).toContain('gap-4')
      expect(tokens).not.toContain('grid-cols-3')
      expect(tokens).not.toContain('partner-base')
      expect(tokens).not.toContain('partner-plugin')
      expect(result.flexAttribute).toBeNull()
      expect(result.partnerFactoryCallsDuringAsChild).toBe(0)
    })

    it('preserves nested asChild classes without duplicating the primary plugin', async () => {
      const primaryResult = await adapter.renderPrimaryPluginAsChild()
      const result = await adapter.renderNestedAsChild()
      const tokens = result.className.split(/\s+/)

      expect(tokens).toContain('primary-base')
      expect(tokens).toContain('child-base')
      expect(tokens).toContain('caller-class')
      expect(tokens).toContain('child-class')
      expect(tokens).toContain('flex')
      expect(tokens).not.toContain('grid-cols-3')
      expect(tokens).not.toContain('partner-base')
      expect(tokens).not.toContain('partner-plugin')
      expect(result.flexAttribute).toBeNull()
      expect(result.partnerFactoryCallsDuringAsChild).toBe(0)
      expect(primaryResult.primaryFactoryCallsDuringAsChild).toBeGreaterThan(0)
      expect(result.primaryFactoryCallsDuringAsChild).toBe(
        primaryResult.primaryFactoryCallsDuringAsChild,
      )
    })
  })
}
