import { describe, expectTypeOf, it } from 'vitest'
import type { AnyFactoryOptions, EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { AnyBuiltRuntime, BuiltRuntime } from './types'
import { createContractComponent } from './create-contract-component'
import { defineContractComponent } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContractComponent — Svelte integration', () => {
  // Svelte's createContractComponent returns a BuiltRuntime bundle rather than a component
  // function — Svelte components must originate from .svelte files (compile-time constraint).
  it('produces a BuiltRuntime bundle with the correct generics', () => {
    const options = {
      tag: 'div' as const,
      name: 'Box',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const bundle = defineContractComponent(options)(createContractComponent)

    type Expected = BuiltRuntime<PolymorphicGenerics<'div', EmptyRecord, typeof variants>>
    expectTypeOf(bundle).toMatchTypeOf<Expected>()
  })

  it('satisfies AnyBuiltRuntime structural shape', () => {
    const options = { tag: 'a' as const, name: 'Link' } satisfies AnyFactoryOptions
    const bundle = defineContractComponent(options)(createContractComponent)

    expectTypeOf(bundle).toMatchTypeOf<AnyBuiltRuntime>()
  })

  it('different calls to the bound factory are independent', () => {
    const options = {
      tag: 'button' as const,
      name: 'Button',
      styling: { variants },
    } satisfies AnyFactoryOptions

    const createButton = defineContractComponent(options)
    const bundleA = createButton(createContractComponent)
    const bundleB = createButton(createContractComponent)

    type Expected = BuiltRuntime<PolymorphicGenerics<'button', EmptyRecord, typeof variants>>
    expectTypeOf(bundleA).toMatchTypeOf<Expected>()
    expectTypeOf(bundleB).toMatchTypeOf<Expected>()
  })
})
