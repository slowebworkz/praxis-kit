/**
 * Finding #59: a composing component's own props (`$props` of the constructor signature) must
 * expose the composed partner's declared styling variants, matching `ContractProps<typeof Card>`.
 * Type-level only; no runtime assertions.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { EmptyRecord } from '@praxis-kit/core'
import type { VueFactoryOptions } from './vue-options'
import { createContractComponent } from './create-contract-component'
import type { ContractProps } from './types'

const Surface = createContractComponent({
  tag: 'div',
  name: 'Surface',
  props: undefined as unknown as EmptyRecord,
  styling: {
    base: '',
    variants: {
      shadow: { true: 'shadow-sm', false: 'shadow-none' },
      border: { none: 'border-0', default: 'border' },
    },
  },
} satisfies VueFactoryOptions)

const Card = createContractComponent({
  tag: 'section',
  name: 'Card',
  props: undefined as unknown as EmptyRecord,
  styling: { base: '', variants: { layout: { horizontal: 'flex-row', vertical: 'flex-col' } } },
  // `as const`: under `satisfies VueFactoryOptions` the string default would widen to `string`.
  compose: { with: Surface, allProps: true, defaults: { border: 'default' as const } },
} satisfies VueFactoryOptions)

// Same partner, but the ordinary props are not forwarded: variants are still public.
const Panel = createContractComponent({
  tag: 'section',
  name: 'Panel',
  props: undefined as unknown as EmptyRecord,
  compose: { with: Surface },
} satisfies VueFactoryOptions)

const Plain = createContractComponent({
  tag: 'div',
  name: 'Plain',
  props: undefined as unknown as EmptyRecord,
  styling: { base: '', variants: { tone: { quiet: 'q', loud: 'l' } } },
} satisfies VueFactoryOptions)

void [Card, Panel, Plain] // referenced as types below; keep the values "used"

type PropsOf<T extends new () => { $props: unknown }> = InstanceType<T>['$props']
type KeysOfUnion<T> = T extends unknown ? keyof T : never

describe('composing component props (finding #59)', () => {
  it('accepts the partner variants alongside its own', () => {
    const card: PropsOf<typeof Card> = { shadow: true, border: 'none', layout: 'horizontal' }
    const panel: PropsOf<typeof Panel> = { shadow: true, border: 'default' }
    void card
    void panel
  })

  it('keeps partner variant value types', () => {
    // @ts-expect-error — `border` only accepts 'none' | 'default'
    const card: PropsOf<typeof Card> = { border: 'thick' }
    void card
  })

  it('exposes the same variant keys as ContractProps', () => {
    expectTypeOf<'shadow' | 'border' | 'layout'>().toExtend<KeysOfUnion<PropsOf<typeof Card>>>()
    expectTypeOf<'shadow' | 'border' | 'layout'>().toExtend<
      KeysOfUnion<ContractProps<typeof Card>>
    >()
  })

  it('leaves non-composing components unchanged', () => {
    expectTypeOf<'tone'>().toExtend<KeysOfUnion<PropsOf<typeof Plain>>>()
  })
})
