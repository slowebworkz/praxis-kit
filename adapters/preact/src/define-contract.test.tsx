import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'
import { defineContract } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContract — Preact integration', () => {
  it('produces a PolymorphicComponent with the correct generics', () => {
    const boxContract = defineContract({
      tag: 'div',
      name: 'Box',
      styling: { variants },
    })

    const Box = createContractComponent(boxContract)

    // toMatchTypeOf (structural, one-directional), not toEqualTypeOf: Box's real __contract is
    // the specific literal it was built from (Phase 3's contract-retention marker), narrower than
    // Expected's default (widest FactoryOptions) — this test's intent is "matches the expected G
    // shape," not "has this exact literal __contract."
    type Expected = PolymorphicComponent<PolymorphicGenerics<'div', EmptyRecord, typeof variants>>
    expectTypeOf(Box).toMatchTypeOf({} as Expected)
  })

  it('preserves tag literal on the component type', () => {
    const linkContract = defineContract({ tag: 'a', name: 'Link' })
    const Link = createContractComponent(linkContract)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'a', EmptyRecord, Readonly<EmptyRecord>>
    >
    expectTypeOf(Link).toMatchTypeOf({} as Expected)
  })

  it('a contract can be passed to createContractComponent more than once, independently', () => {
    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      styling: { variants },
    })

    const ButtonA = createContractComponent(buttonContract)
    const ButtonB = createContractComponent(buttonContract)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'button', EmptyRecord, typeof variants>
    >
    expectTypeOf(ButtonA).toMatchTypeOf({} as Expected)
    expectTypeOf(ButtonB).toMatchTypeOf({} as Expected)
  })
})
