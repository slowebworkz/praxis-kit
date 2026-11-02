/**
 * `subComponents` (compound component) coverage for React. The runtime behaviour — assembling,
 * rendering as children, non-regression for plain usage — is the shared `compoundComponentSuite`;
 * this file supplies React's mounting and adds the compile-time half, which depends on React's
 * own component types.
 */
import { describe, it, expectTypeOf } from 'vitest'
import { createElement } from 'react'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { compoundComponentSuite } from '@praxis-kit/adapter-testing'
import { box, useReactDom } from '../shared/test-utils'
import type { PolymorphicComponent } from '../shared'
import { createContractComponent } from './create-contract-component'

const dom = useReactDom()

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
    dom.mount(
      createElement(
        box(Card),
        null,
        createElement(box(Card.Header), { key: 'h' }),
        createElement(box(Card.Content), { key: 'c' }),
        createElement(box(Card.Footer), { key: 'f' }),
      ),
    )
    const section = dom.container.querySelector('section')!
    return { header: section.querySelector('header'), footer: section.querySelector('footer') }
  },
  renderPlain: () => {
    dom.mount(createElement(box(Plain), null, createElement('span', { key: 'x' })))
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
