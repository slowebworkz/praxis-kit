import { describe, expect, it } from 'vitest'
import { expectTokens } from './helpers'

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
export function tailwindAsChildPluginParitySuite(
  adapter: TailwindAsChildPluginParityAdapter,
): void {
  // What both scenarios share: the primary plugin styled the slotted host (base, caller, child and
  // display classes, with the primary's own grid utilities filtered out of flex mode), and the
  // partner contributed nothing — no classes, no leaked `flex` attribute, no factory calls.
  // `extraClasses` are the classes particular to each scenario.
  const expectPrimaryOwnsHost = (
    result: TailwindAsChildPluginResult,
    extraClasses: readonly string[],
  ) => {
    expectTokens(result.className, {
      has: ['primary-base', 'caller-class', 'child-class', 'flex', ...extraClasses],
      lacks: ['grid-cols-3', 'partner-base', 'partner-plugin'],
    })
    expect(result.flexAttribute).toBeNull()
    expect(result.partnerFactoryCallsDuringAsChild).toBe(0)
  }

  describe('Tailwind explicit asChild plugin parity', () => {
    it('keeps the primary Tailwind plugin on the explicit asChild path', async () => {
      expectPrimaryOwnsHost(await adapter.renderPrimaryPluginAsChild(), ['gap-4'])
    })

    it('preserves nested asChild classes without duplicating the primary plugin', async () => {
      const primaryResult = await adapter.renderPrimaryPluginAsChild()
      const result = await adapter.renderNestedAsChild()

      expectPrimaryOwnsHost(result, ['child-base'])
      expect(primaryResult.primaryFactoryCallsDuringAsChild).toBeGreaterThan(0)
      expect(result.primaryFactoryCallsDuringAsChild).toBe(
        primaryResult.primaryFactoryCallsDuringAsChild,
      )
    })
  })
}
