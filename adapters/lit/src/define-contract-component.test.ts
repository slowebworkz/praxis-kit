import { describe, expectTypeOf, it } from 'vitest'
import type { AnyFactoryOptions, EmptyRecord } from '@praxis-kit/core'
import type { LitContractComponent } from './types/index'
import { createContractComponent } from './create-contract-component'
import { defineContractComponent } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContractComponent — Lit integration', () => {
  // Lit's createContractComponent returns a LitElement subclass constructor rather than
  // a component function — custom elements are registered via customElements.define().
  it('produces a LitContractComponent with variants reflected in the constructor type', () => {
    const options = {
      tag: 'div' as const,
      name: 'Box',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const Box = defineContractComponent(options)(createContractComponent)

    expectTypeOf(Box).toMatchTypeOf<LitContractComponent<typeof variants>>()
  })

  it('produces a LitContractComponent with no variants when none are provided', () => {
    const options = { tag: 'a' as const, name: 'Link' } satisfies AnyFactoryOptions
    const Link = defineContractComponent(options)(createContractComponent)

    expectTypeOf(Link).toMatchTypeOf<LitContractComponent<Readonly<EmptyRecord>>>()
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

    expectTypeOf(ButtonA).toMatchTypeOf<LitContractComponent<typeof variants>>()
    expectTypeOf(ButtonB).toMatchTypeOf<LitContractComponent<typeof variants>>()
  })
})
