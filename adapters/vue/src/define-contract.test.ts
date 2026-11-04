import { describe, expectTypeOf, it } from 'vitest'
import type { EmptyRecord, PolymorphicGenerics } from '@praxis-kit/core'
import type { PolymorphicComponent } from './types'
import { createContractComponent } from './create-contract-component'
import { defineContract } from '@praxis-kit/adapter-utils'

const variants = {
  size: { sm: 'text-sm', lg: 'text-lg' },
  intent: { primary: 'bg-blue-500', ghost: 'bg-transparent' },
} as const

describe('defineContract — Vue integration', () => {
  it('produces a PolymorphicComponent with the correct generics', () => {
    const boxContract = defineContract({
      tag: 'div',
      name: 'Box',
      styling: { variants },
    })

    const Box = createContractComponent(boxContract)

    // createContractComponent's return type is `MergeRecords<PolymorphicComponent<G, C>,
    // TSubComponents>` — TSubComponents defaults to EmptyRecord when no subComponents option
    // is passed, and MergeRecords collapses that to just PolymorphicComponent<G, C> rather than
    // showing a no-op `& EmptyRecord` intersection. toMatchTypeOf (structural, one-directional),
    // not toEqualTypeOf: Box's real __contract is the specific literal it was built from (Phase
    // 3's contract-retention marker), narrower than Expected's default (widest FactoryOptions).
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

// Public factory validation runs after options inference: partner variants are accepted, while
// variants owned only by the primary component are rejected in compose.defaults.
const ComposeDefaultsSurface = createContractComponent({
  tag: 'div',
  name: 'ComposeDefaultsSurface',
  props: undefined as unknown as { radius?: 'sm' | 'lg' },
  styling: { variants: { tone: { quiet: 'tone-quiet', loud: 'tone-loud' } } },
})
const ComposeDefaultsValid = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsValid',
  styling: { variants: { size: { small: 'size-small', large: 'size-large' } } },
  compose: { with: ComposeDefaultsSurface, defaults: { tone: 'quiet' } as const },
})
void ComposeDefaultsValid

const ComposeDefaultsInvalid = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalid',
  styling: { variants: { size: { small: 'size-small', large: 'size-large' } } },
  // @ts-expect-error — `size` belongs to the primary component, not ComposeDefaultsSurface.
  compose: { with: ComposeDefaultsSurface, defaults: { size: 'small' } as const },
})
void ComposeDefaultsInvalid

const ComposeDefaultsInvalidOrdinary = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalidOrdinary',
  // @ts-expect-error — ordinary partner props are not declared variants and cannot be defaulted.
  compose: { with: ComposeDefaultsSurface, defaults: { radius: 'sm' } as const },
})
void ComposeDefaultsInvalidOrdinary

const ComposeDefaultsInvalidValue = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalidValue',
  // @ts-expect-error — a declared partner variant still rejects values outside its declared set.
  compose: { with: ComposeDefaultsSurface, defaults: { tone: 'bright' } as const },
})
void ComposeDefaultsInvalidValue
