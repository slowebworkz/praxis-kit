import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import { defineContract } from '@praxis-kit/adapter-utils'
import type { AnyBuiltRuntime, BuiltRuntime } from './types'
import { createContractComponent } from './create-contract-component'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContract — Svelte integration', () => {
  // Svelte's createContractComponent returns a BuiltRuntime bundle rather than a component
  // function — Svelte components must originate from .svelte files (compile-time constraint).
  it('produces a BuiltRuntime bundle with the correct generics', () => {
    const boxContract = defineContract({
      tag: 'div',
      name: 'Box',
      styling: { variants },
    })

    const bundle = createContractComponent(boxContract)

    type Expected = BuiltRuntime<PolymorphicGenerics<'div', EmptyRecord, typeof variants>>
    expectTypeOf(bundle).toMatchTypeOf<Expected>()
  })

  it('satisfies AnyBuiltRuntime structural shape', () => {
    const linkContract = defineContract({ tag: 'a', name: 'Link' })
    const bundle = createContractComponent(linkContract)

    expectTypeOf(bundle).toMatchTypeOf<AnyBuiltRuntime>()
  })

  it('different calls with the same contract are independent', () => {
    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      styling: { variants },
    })

    const bundleA = createContractComponent(buttonContract)
    const bundleB = createContractComponent(buttonContract)

    type Expected = BuiltRuntime<PolymorphicGenerics<'button', EmptyRecord, typeof variants>>
    expectTypeOf(bundleA).toMatchTypeOf<Expected>()
    expectTypeOf(bundleB).toMatchTypeOf<Expected>()
  })
})
