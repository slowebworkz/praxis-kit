/**
 * Finding #59: a composing component's own call signature must expose the composed partner's
 * declared styling variants, matching `ContractProps<typeof Card>`. Type-level only; no runtime
 * assertions. Partner *plugin* props are deliberately not exposed (see DECISIONS.md known limit).
 */
import type { ComponentProps } from 'react'
import { describe, it, expectTypeOf } from 'vitest'
import type { EmptyRecord } from '@praxis-kit/core'
import { createTailwindPipeline } from '@praxis-kit/tailwind'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, ReactFactoryOptions } from '../shared'

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
    plugin: createTailwindPipeline,
  },
} satisfies ReactFactoryOptions)

const Card = createContractComponent({
  tag: 'section',
  name: 'Card',
  props: undefined as unknown as EmptyRecord,
  styling: { base: '', variants: { layout: { horizontal: 'flex-row', vertical: 'flex-col' } } },
  // `as const`: under `satisfies ReactFactoryOptions` the string default would widen to `string`.
  compose: { with: Surface, allProps: true, defaults: { border: 'default' as const } },
} satisfies ReactFactoryOptions)

// Same partner, but the ordinary props are not forwarded: variants are still public.
const Panel = createContractComponent({
  tag: 'section',
  name: 'Panel',
  props: undefined as unknown as EmptyRecord,
  compose: { with: Surface },
} satisfies ReactFactoryOptions)

const Plain = createContractComponent({
  tag: 'div',
  name: 'Plain',
  props: undefined as unknown as EmptyRecord,
  styling: { base: '', variants: { tone: { quiet: 'q', loud: 'l' } } },
} satisfies ReactFactoryOptions)

describe('composing component call signature (finding #59)', () => {
  it('accepts the partner variants inline, alongside its own', () => {
    void (<Card shadow border="none" layout="horizontal" />)
    void (<Panel shadow border="default" />)
  })

  it('keeps partner variant value types', () => {
    // @ts-expect-error — `border` only accepts 'none' | 'default'
    void (<Card border="thick" />)
    // @ts-expect-error — `shadow` is boolean-like
    void (<Panel shadow="big" />)
  })

  it('exposes the same variant keys as ContractProps', () => {
    type Call = keyof ComponentProps<typeof Card>
    type Extracted = keyof ContractProps<typeof Card>
    expectTypeOf<'shadow' | 'border' | 'layout'>().toExtend<Call>()
    expectTypeOf<'shadow' | 'border' | 'layout'>().toExtend<Extracted>()
  })

  it('leaves non-composing components unchanged', () => {
    void (<Plain tone="quiet" />)
    // @ts-expect-error — no composed partner, so no `shadow`
    void (<Plain shadow />)
    expectTypeOf<ComponentProps<typeof Plain>>().toHaveProperty('tone')
  })

  it('does not expose the partner plugin props on the call signature', () => {
    // @ts-expect-error — `flex` is Surface's plugin prop; primary has no plugin (known limit)
    void (<Card flex />)
  })
})
