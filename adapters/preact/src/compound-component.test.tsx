// @vitest-environment jsdom
/**
 * `subComponents` (compound component) coverage for Preact. The runtime behaviour — assembling,
 * rendering as children, non-regression for plain usage — is the shared `compoundComponentSuite`;
 * this file supplies Preact's mounting and adds the compile-time half, which depends on Preact's
 * own component types.
 */
import { describe, it, expectTypeOf, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'
import type { ComponentType } from 'preact'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { compoundComponentSuite } from '@praxis-kit/adapter-testing'
import type { AnyVNode, PolymorphicComponent, UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

// Cast to bypass the PolymorphicComponent union in h() overloads.
function box(comp: { displayName?: string }): ComponentType<UnknownProps> {
  return comp as unknown as ComponentType<UnknownProps>
}

let container: HTMLElement

function mount(element: AnyVNode) {
  render(element, container)
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  render(null, container)
  document.body.removeChild(container)
})

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
    mount(
      h(
        box(Card),
        null,
        h(box(Card.Header), { key: 'h' }),
        h(box(Card.Content), { key: 'c' }),
        h(box(Card.Footer), { key: 'f' }),
      ),
    )
    const section = container.querySelector('section')!
    return { header: section.querySelector('header'), footer: section.querySelector('footer') }
  },
  renderPlain: () => {
    mount(h(box(Plain), null, h('span', { key: 'x' })))
  },
})

describe('subComponents (compound component generation) — types', () => {
  it('has the correct compile-time type for each sub-component', () => {
    expectTypeOf(Card.Header).toEqualTypeOf(Header)
    expectTypeOf(Card.Content).toEqualTypeOf(Content)
    expectTypeOf(Card.Footer).toEqualTypeOf(Footer)
  })

  it('ComponentProps-style call-signature extraction still resolves the root’s own props, unaffected by the sub-component intersection', () => {
    type RootProps = Parameters<typeof Card>[0]
    expectTypeOf<RootProps>().toMatchTypeOf<{ as?: unknown }>()
  })

  it('a plain (non-compound) component keeps the plain polymorphic type', () => {
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    >
    // toMatchTypeOf (structural, one-directional), not toEqualTypeOf: Plain's real __contract is
    // the specific literal it was built from (Phase 3's contract-retention marker), narrower than
    // Expected's default (widest FactoryOptions) — this test's intent is "matches the expected G
    // shape," not "has this exact literal __contract," so assignability is what matters here.
    expectTypeOf(Plain).toMatchTypeOf({} as Expected)
  })
})
