import { describe, expectTypeOf, it } from 'vitest'
import type { AnyFactoryOptions, EmptyRecord } from '@praxis-kit/core'
import type { WebContractComponent } from './types/index'
import { createContractComponent } from './create-contract-component'
import { defineContractComponent } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContractComponent — Web Components integration', () => {
  // Web's createContractComponent returns a plain HTMLElement subclass constructor —
  // no framework dependency; register with customElements.define().
  it('produces a WebContractComponent with variants reflected in the constructor type', () => {
    const options = {
      tag: 'div' as const,
      name: 'Box',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const Box = defineContractComponent(options)(createContractComponent)

    expectTypeOf(Box).toMatchTypeOf<WebContractComponent<typeof variants>>()
  })

  it('produces a WebContractComponent with no variants when none are provided', () => {
    const options = { tag: 'a' as const, name: 'Link' } satisfies AnyFactoryOptions
    const Link = defineContractComponent(options)(createContractComponent)

    expectTypeOf(Link).toMatchTypeOf<WebContractComponent<Readonly<EmptyRecord>>>()
  })

  it('different calls to the bound factory are independent', () => {
    const options = {
      tag: 'button' as const,
      name: 'Button',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const createButton = defineContractComponent(options)
    const ButtonA = createButton(createContractComponent)
    const ButtonB = createButton(createContractComponent)

    expectTypeOf(ButtonA).toMatchTypeOf<WebContractComponent<typeof variants>>()
    expectTypeOf(ButtonB).toMatchTypeOf<WebContractComponent<typeof variants>>()
  })
})
