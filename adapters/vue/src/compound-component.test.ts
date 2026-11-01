/**
 * `subComponents` (compound component) coverage for Vue. The runtime behaviour — assembling,
 * rendering as children, non-regression for plain usage — is the shared `compoundComponentSuite`;
 * this file supplies Vue's mounting and adds the compile-time half, which depends on Vue's own
 * component types.
 */
import { describe, it, expectTypeOf } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { compoundComponentSuite } from '@praxis-kit/adapter-testing'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

const Header = createContractComponent({ tag: 'header', name: 'CardHeader' })
const Content = createContractComponent({ tag: 'div', name: 'CardContent' })
const Footer = createContractComponent({ tag: 'footer', name: 'CardFooter' })

const Card = createContractComponent({
  tag: 'section',
  name: 'Card',
  subComponents: { Header, Content, Footer },
})

const Plain = createContractComponent({ tag: 'div', name: 'Plain' })

compoundComponentSuite({
  components: { Card, Header, Content, Footer, Plain },
  renderCompound: () => {
    const wrapper = mount(box(Card), {
      slots: {
        default: () => [h(box(Card.Header)), h(box(Card.Content)), h(box(Card.Footer))],
      },
    })
    return {
      header: wrapper.element.querySelector('header'),
      footer: wrapper.element.querySelector('footer'),
    }
  },
  renderPlain: () => {
    mount(box(Plain), { slots: { default: () => [h('span')] } })
  },
})

describe('subComponents (compound component generation) — types', () => {
  it('has the correct compile-time type for each sub-component', () => {
    expectTypeOf(Card.Header).toEqualTypeOf(Header)
    expectTypeOf(Card.Content).toEqualTypeOf(Content)
    expectTypeOf(Card.Footer).toEqualTypeOf(Footer)
  })

  it('a plain (non-compound) component keeps the plain polymorphic type', () => {
    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'div', EmptyRecord, Readonly<EmptyRecord>>
    >
    // toMatchTypeOf (structural, one-directional), not toEqualTypeOf: Plain's real __contract is
    // the specific literal it was built from (Phase 3's contract-retention marker), narrower than
    // Expected's default (widest FactoryOptions) — this test's intent is "matches the expected G
    // shape," not "has this exact literal __contract."
    expectTypeOf(Plain).toMatchTypeOf({} as Expected)
  })
})
