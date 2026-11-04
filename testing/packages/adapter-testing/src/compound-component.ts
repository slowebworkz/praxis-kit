import { describe, expect, it } from 'vitest'

/** What mounting a compound component yields: the hosts its Header and Footer rendered to. */
export type CompoundRender = {
  readonly header: Element | null
  readonly footer: Element | null
}

/**
 * Adapter contract for the compound-component suite.
 *
 * Each adapter builds the components itself, because it also type-checks them with `expectTypeOf`
 * (those assertions depend on the adapter's own component types and so cannot be shared). The
 * suite takes them as data and owns the runtime behaviour; the adapter owns how to mount them and
 * how to find their hosts, since both are framework-specific.
 */
export type CompoundComponentAdapter = {
  readonly components: {
    /** Created with `subComponents: { Header, Content, Footer }`. */
    readonly Card: object
    readonly Header: object
    readonly Content: object
    readonly Footer: object
    /** Created without `subComponents`. */
    readonly Plain: object
  }
  /** Mount `Card` with `Card.Header`, `Card.Content` and `Card.Footer` as its ordinary children. */
  readonly renderCompound: () => CompoundRender | Promise<CompoundRender>
  /**
   * Mount `Plain` with a child. Must not throw. Omit where a plain component is not mounted this
   * way (the element adapters, which only check that no sub-component properties appear).
   */
  readonly renderPlain?: () => void | Promise<void>
}

const SUB_COMPONENT_KEYS = ['Header', 'Content', 'Footer'] as const

/**
 * Compound-component (`subComponents`) parity suite. Verifies that every adapter assembles the
 * given sub-components onto the root, that they render as ordinary children, and that a component
 * created without `subComponents` is left untouched.
 *
 * The compile-time half of the contract (`expectTypeOf` on the assembled type) stays in each
 * adapter's own test file. Lifecycle hooks (cleanup between tests) also stay there.
 */
export function compoundComponentSuite(adapter: CompoundComponentAdapter): void {
  const { components } = adapter

  describe('subComponents (compound component generation)', () => {
    it('assembles the sub-components onto the root, like Object.assign would', () => {
      const card: Record<string, unknown> = components.Card as Record<string, unknown>
      for (const key of SUB_COMPONENT_KEYS) expect(card[key]).toBe(components[key])
    })

    it('renders the assembled sub-components as ordinary children', async () => {
      const { header, footer } = await adapter.renderCompound()
      expect(header).toBeTruthy()
      expect(footer).toBeTruthy()
    })

    it('a plain (non-compound) component is unaffected — no subComponents option', async () => {
      for (const key of SUB_COMPONENT_KEYS) expect(components.Plain).not.toHaveProperty(key)
      await adapter.renderPlain?.()
    })
  })
}
