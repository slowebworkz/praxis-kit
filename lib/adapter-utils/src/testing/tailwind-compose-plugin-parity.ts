import { describe, expect, it, vi } from 'vitest'
import { CollectingReporter, DefaultPolicy, Diagnostics, Severity } from '@praxis-kit/diagnostics'
import type { ClassPluginFactory } from '@praxis-kit/styling'

export type TailwindComposeRenderResult = {
  readonly className: string
  readonly flexAttribute: string | null
}

/** The primary component in `renderPrimaryWins` must be created with this `name`. */
export const TAILWIND_COMPOSE_CONFLICT_COMPONENT = 'ConflictCard'

export type TailwindComposePrimaryWinsResult = TailwindComposeRenderResult & {
  /** Every diagnostic reported while composing; the suite filters for COMP1016. */
  readonly diagnostics: readonly {
    readonly code: string
    readonly component?: string | undefined
  }[]
  /** Partner plugin factory invocations between partner creation and composition completing. */
  readonly partnerFactoryCallsDuringComposition: number
}

/**
 * Shared fixture for the plugin-conflict case. Create the partner with `partnerPlugin`, call
 * `afterPartner()`, create the primary (with `diagnostics` and `primaryPlugin`) and call
 * `afterComposition()`, then render and pass the DOM result through `result()`.
 */
export function createComposeConflictFixture() {
  const reporter = new CollectingReporter()
  const diagnostics = new Diagnostics(
    reporter,
    new DefaultPolicy({ reportThreshold: Severity.Warning, throwThreshold: Severity.Fatal }),
  )
  const primaryMock = vi.fn(() => ({ pipeline: () => 'primary-plugin' }))
  const partnerMock = vi.fn(() => ({ pipeline: () => 'partner-plugin' }))
  // Cast at the boundary so the mocks keep their `.mock` typing.
  const asPlugin = (factory: unknown) => factory as ClassPluginFactory
  let callsBefore = 0
  let callsDuring = 0
  let reported: TailwindComposePrimaryWinsResult['diagnostics'] = []
  return {
    diagnostics,
    primaryPlugin: asPlugin(primaryMock),
    partnerPlugin: asPlugin(partnerMock),
    afterPartner(): void {
      callsBefore = partnerMock.mock.calls.length
    },
    afterComposition(): void {
      callsDuring = partnerMock.mock.calls.length - callsBefore
      reported = reporter.diagnostics.map(({ code, component }) => ({ code, component }))
    },
    result(rendered: TailwindComposeRenderResult): TailwindComposePrimaryWinsResult {
      return {
        ...rendered,
        diagnostics: reported,
        partnerFactoryCallsDuringComposition: callsDuring,
      }
    },
  }
}

export type TailwindComposeParityAdapter = {
  /** Render a primary component composed with a Tailwind-enabled partner. */
  readonly renderPartnerPlugin: () =>
    TailwindComposeRenderResult | Promise<TailwindComposeRenderResult>
  /** Render a Tailwind-enabled partner whose compose.defaults sets a plugin-owned display prop. */
  readonly renderOwnedDefault: () =>
    TailwindComposeRenderResult | Promise<TailwindComposeRenderResult>
  /** Render two components with distinct plugin factories; the primary factory must win. */
  readonly renderPrimaryWins: () =>
    TailwindComposePrimaryWinsResult | Promise<TailwindComposePrimaryWinsResult>
}

/**
 * Runtime composition parity for adapters that implement declarative `compose.with`.
 * Lit and Web intentionally do not support component composition and must not be wired here.
 */
export function tailwindComposePluginParitySuite(adapter: TailwindComposeParityAdapter): void {
  describe('Tailwind composition plugin parity', () => {
    it('selects the direct partner plugin when the primary has none and resolves combined classes', async () => {
      const result = await adapter.renderPartnerPlugin()
      const tokens = result.className.split(/\s+/)

      expect(tokens).toContain('flex')
      expect(tokens).toContain('gap-4')
      expect(tokens).toContain('rounded')
      expect(tokens).toContain('border')
      expect(tokens).not.toContain('grid-cols-3')
      expect(result.flexAttribute).toBeNull()
    })

    it('uses the primary plugin when both components configure different factories', async () => {
      const result = await adapter.renderPrimaryWins()
      const tokens = result.className.split(/\s+/)

      expect(tokens).toContain('primary-plugin')
      expect(tokens).not.toContain('partner-plugin')
    })

    it('reports the plugin conflict once without invoking the partner factory', async () => {
      const result = await adapter.renderPrimaryWins()
      const conflicts = result.diagnostics.filter((diagnostic) => diagnostic.code === 'COMP1016')

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0]?.component).toBe(TAILWIND_COMPOSE_CONFLICT_COMPONENT)
      expect(result.partnerFactoryCallsDuringComposition).toBe(0)
    })

    it('applies plugin-owned display props from compose.defaults as styling inputs, not host props', async () => {
      const result = await adapter.renderOwnedDefault()
      const tokens = result.className.split(/\s+/)

      expect(tokens).toContain('partner-base')
      expect(tokens).toContain('primary-base')
      // The default is a lower-precedence styling input for the partner's plugin: it yields the
      // `flex` class but must not leak onto the host element as a `flex` attribute.
      expect(tokens).toContain('flex')
      expect(result.flexAttribute).toBeNull()
    })
  })
}
