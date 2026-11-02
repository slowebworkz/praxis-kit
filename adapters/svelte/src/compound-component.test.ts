// @vitest-environment jsdom
/**
 * `subComponents` (compound component) coverage for Svelte. The runtime behaviour — assembling,
 * rendering as children, non-regression for plain usage — is the shared `compoundComponentSuite`;
 * this file supplies Svelte's mounting, adds the compile-time half, and keeps the one check that
 * depends on this adapter's bundle shape.
 */
import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import { compoundComponentSuite } from '@praxis-kit/adapter-testing'
import { createContractComponent } from './create-contract-component'
import Polymorphic from './Polymorphic.svelte'
import Host from './compound-component.test-host.svelte'

afterEach(cleanup)

const Header = createContractComponent({ tag: 'header' as const, name: 'CardHeader' })
const Content = createContractComponent({ tag: 'div' as const, name: 'CardContent' })
const Footer = createContractComponent({ tag: 'footer' as const, name: 'CardFooter' })

const Card = createContractComponent({
  tag: 'section' as const,
  name: 'Card',
  subComponents: { Header, Content, Footer },
})

const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })

compoundComponentSuite({
  components: { Card, Header, Content, Footer, Plain },
  renderCompound: () => {
    const { container } = render(Host, { root: Card, childBundles: [Header, Content, Footer] })
    const section = container.querySelector('section')!
    return { header: section.querySelector('header'), footer: section.querySelector('footer') }
  },
  renderPlain: () => {
    render(Polymorphic, { bundle: Plain })
  },
})

describe('subComponents (compound component generation) — types and bundle shape', () => {
  it('has the correct compile-time type for each sub-component', () => {
    expectTypeOf(Card.Header).toEqualTypeOf(Header)
    expectTypeOf(Card.Content).toEqualTypeOf(Content)
    expectTypeOf(Card.Footer).toEqualTypeOf(Footer)
  })

  it('a plain (non-compound) bundle keeps its core fields', () => {
    // No subComponents were passed, so assembleCompoundComponent short-circuits and returns the
    // bundle untouched: it keeps the core bundle fields and gains no sub-component properties.
    // (Not pinned to an exact key list — the bundle may gain internal fields without that
    // meaning a compound was assembled.)
    expect(Object.keys(Plain)).toEqual(
      expect.arrayContaining(['runtime', 'filterProps', 'slotValidator']),
    )
  })
})
