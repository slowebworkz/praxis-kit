// @vitest-environment jsdom
/**
 * `subComponents` (compound component) coverage for Solid. The runtime behaviour — assembling,
 * rendering as children, non-regression for plain usage — is the shared `compoundComponentSuite`;
 * this file supplies Solid's mounting and adds the compile-time half, which depends on Solid's
 * own component types.
 */
import { describe, it, expectTypeOf, afterEach } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { compoundComponentSuite } from '@praxis-kit/adapter-testing'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'

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
    const { container } = solidRender(() => (
      <Card>
        <Card.Header />
        <Card.Content />
        <Card.Footer />
      </Card>
    ))
    const section = container.querySelector('section')!
    return { header: section.querySelector('header'), footer: section.querySelector('footer') }
  },
  renderPlain: () => {
    solidRender(() => <Plain>{'span content'}</Plain>)
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
    expectTypeOf(Plain).toMatchTypeOf({} as Expected)
  })
})
