import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord } from '@praxis-kit/core'
import type { WebContractComponent } from './types/index'
import { createContractComponent } from './create-contract-component'
import { defineContract } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContract — Web Components integration', () => {
  // Web's createContractComponent returns a plain HTMLElement subclass constructor —
  // no framework dependency; register with customElements.define().
  it('produces a WebContractComponent with variants reflected in the constructor type', () => {
    const boxContract = defineContract({
      tag: 'div',
      name: 'Box',
      styling: { variants },
    })

    const Box = createContractComponent(boxContract)

    expectTypeOf(Box).toMatchTypeOf<WebContractComponent<typeof variants>>()
  })

  it('produces a WebContractComponent with no variants when none are provided', () => {
    const linkContract = defineContract({ tag: 'a', name: 'Link' })
    const Link = createContractComponent(linkContract)

    expectTypeOf(Link).toMatchTypeOf<WebContractComponent<Readonly<EmptyRecord>>>()
  })

  it('a contract can be passed to createContractComponent more than once, independently', () => {
    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      styling: { variants },
    })

    const ButtonA = createContractComponent(buttonContract)
    const ButtonB = createContractComponent(buttonContract)

    expectTypeOf(ButtonA).toMatchTypeOf<WebContractComponent<typeof variants>>()
    expectTypeOf(ButtonB).toMatchTypeOf<WebContractComponent<typeof variants>>()
  })
})
