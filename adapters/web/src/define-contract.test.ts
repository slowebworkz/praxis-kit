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

// @ts-expect-error — `size` belongs to the primary component, not ComposeDefaultsSurface.
const ComposeDefaultsInvalid = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalid',
  styling: { variants: { size: { small: 'size-small', large: 'size-large' } } },
  compose: { with: ComposeDefaultsSurface, defaults: { size: 'small' } as const },
})
void ComposeDefaultsInvalid


// @ts-expect-error — ordinary partner props are not declared variants and cannot be defaulted.
const ComposeDefaultsInvalidOrdinary = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalidOrdinary',
  compose: { with: ComposeDefaultsSurface, defaults: { radius: 'sm' } as const },
})
void ComposeDefaultsInvalidOrdinary

// @ts-expect-error — a declared partner variant still rejects values outside its declared set.
const ComposeDefaultsInvalidValue = createContractComponent({
  tag: 'section',
  name: 'ComposeDefaultsInvalidValue',
  compose: { with: ComposeDefaultsSurface, defaults: { tone: 'bright' } as const },
})
void ComposeDefaultsInvalidValue
