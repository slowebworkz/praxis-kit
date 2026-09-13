import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord } from '@praxis-kit/core'
import type { LitContractComponent } from './types/index'
import { createContractComponent } from './create-contract-component'
import { defineContract } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContract — Lit integration', () => {
  // Lit's createContractComponent returns a LitElement subclass constructor rather than
  // a component function — custom elements are registered via customElements.define().
  it('produces a LitContractComponent with variants reflected in the constructor type', () => {
    const boxContract = defineContract({
      tag: 'div',
      name: 'Box',
      styling: { variants },
    })

    const Box = createContractComponent(boxContract)

    expectTypeOf(Box).toMatchTypeOf<LitContractComponent<typeof variants>>()
  })

  it('produces a LitContractComponent with no variants when none are provided', () => {
    const linkContract = defineContract({ tag: 'a', name: 'Link' })
    const Link = createContractComponent(linkContract)

    expectTypeOf(Link).toMatchTypeOf<LitContractComponent<Readonly<EmptyRecord>>>()
  })

  it('a contract can be passed to createContractComponent more than once, independently', () => {
    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      styling: { variants },
    })

    const ButtonA = createContractComponent(buttonContract)
    const ButtonB = createContractComponent(buttonContract)

    expectTypeOf(ButtonA).toMatchTypeOf<LitContractComponent<typeof variants>>()
    expectTypeOf(ButtonB).toMatchTypeOf<LitContractComponent<typeof variants>>()
  })
})
