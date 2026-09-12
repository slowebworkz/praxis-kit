import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from '../shared'
import { createContractComponent } from './create-contract-component'
import { defineContractComponent } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContractComponent — React integration', () => {
  it('produces a PolymorphicComponent with the correct generics', () => {
    const createBox = defineContractComponent({
      tag: 'div' as const,
      name: 'Box',
      styling: { variants },
    })

    const Box = createBox(createContractComponent)

    // createContractComponent's return type is `MergeRecords<PolymorphicComponent<G, C>,
    // TSubComponents>` — TSubComponents defaults to EmptyRecord when no subComponents option
    // is passed, and MergeRecords collapses that to just PolymorphicComponent<G, C> rather than
    // showing a no-op `& EmptyRecord` intersection. toMatchTypeOf (structural, one-directional),
    // not toEqualTypeOf: Box's real __contract is the specific literal it was built from (Phase
    // 3's contract-retention marker), narrower than Expected's default (widest FactoryOptions,
    // since Expected doesn't specify one) — this test's intent is "matches the expected G shape,"
    // not "has this exact literal __contract."
    type Expected = PolymorphicComponent<PolymorphicGenerics<'div', EmptyRecord, typeof variants>>
    expectTypeOf(Box).toMatchTypeOf({} as Expected)
  })

  it('preserves tag literal on the component type', () => {
    const createLink = defineContractComponent({ tag: 'a' as const, name: 'Link' })
    const Link = createLink(createContractComponent)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'a', EmptyRecord, Readonly<EmptyRecord>>
    >
    expectTypeOf(Link).toMatchTypeOf({} as Expected)
  })

  it('different calls to the bound factory are independent', () => {
    const createButton = defineContractComponent({
      tag: 'button' as const,
      name: 'Button',
      styling: { variants },
    })

    const ButtonA = createButton(createContractComponent)
    const ButtonB = createButton(createContractComponent)

    type Expected = PolymorphicComponent<
      PolymorphicGenerics<'button', EmptyRecord, typeof variants>
    >
    expectTypeOf(ButtonA).toMatchTypeOf({} as Expected)
    expectTypeOf(ButtonB).toMatchTypeOf({} as Expected)
  })
})
