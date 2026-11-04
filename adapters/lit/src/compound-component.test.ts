/**
 * `subComponents` (compound component) coverage for Lit. The runtime behaviour — assembling,
 * rendering as children, non-regression for plain usage — is the shared `compoundComponentSuite`.
 * Here the sub-components are static properties on the custom-element class, so this file
 * registers the elements, supplies Lit's mounting, and adds the compile-time half.
 */
import { describe, it, expectTypeOf, beforeAll, afterEach } from 'vitest'
import { compoundComponentSuite } from '@praxis-kit/adapter-testing'
import { createContractComponent } from './create-contract-component'

type LitEl = HTMLElement & { updateComplete: Promise<boolean> }

function define(name: string, ctor: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, ctor)
}

afterEach(() => {
  document.body.innerHTML = ''
})

const Header = createContractComponent({ tag: 'header', name: 'CardHeader' })
const Content = createContractComponent({ tag: 'div', name: 'CardContent' })
const Footer = createContractComponent({ tag: 'footer', name: 'CardFooter' })

const Card = createContractComponent({
  tag: 'section',
  name: 'Card',
  subComponents: { Header, Content, Footer },
})

const Plain = createContractComponent({ tag: 'div', name: 'Plain' })

beforeAll(() => {
  define('pk-card-header', Header)
  define('pk-card-content', Content)
  define('pk-card-footer', Footer)
  define('pk-card', Card)
})

// `renderPlain` is omitted: a plain element is only checked for the absence of sub-components.
compoundComponentSuite({
  components: { Card, Header, Content, Footer, Plain },
  renderCompound: async () => {
    const card = document.createElement('pk-card')
    card.appendChild(new Card.Header())
    card.appendChild(new Card.Content())
    card.appendChild(new Card.Footer())
    document.body.appendChild(card)
    await (card as unknown as LitEl).updateComplete

    return {
      header: card.querySelector('pk-card-header'),
      footer: card.querySelector('pk-card-footer'),
    }
  },
})

describe('subComponents (compound component generation) — types', () => {
  it('has the correct compile-time type for each sub-component', () => {
    expectTypeOf(Card.Header).toEqualTypeOf(Header)
    expectTypeOf(Card.Content).toEqualTypeOf(Content)
    expectTypeOf(Card.Footer).toEqualTypeOf(Footer)
  })
})
