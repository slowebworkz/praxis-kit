import { describe, expect, expectTypeOf, it } from 'vitest'
import { defineContract } from './define-contract'
import type { ContractPresetOf, ContractTagOf, ContractVariantsOf } from '@praxis-kit/core'

describe('defineContract — runtime (identity, no normalization)', () => {
  it('returns the exact same object reference it was given', () => {
    const options = { tag: 'div', name: 'Box' }
    expect(defineContract(options)).toBe(options)
  })

  it('does not add, remove, or default any field', () => {
    const options = { tag: 'button', name: 'Button' } as const
    expect(defineContract(options)).toEqual({ tag: 'button', name: 'Button' })
  })
})

describe('defineContract — type-level: requires tag/name, preserves the concrete contract', () => {
  it('rejects a config missing tag', () => {
    // @ts-expect-error — ContractInput requires `tag`
    defineContract({ name: 'Box' })
  })

  it('rejects a config missing name', () => {
    // @ts-expect-error — ContractInput requires `name`
    defineContract({ tag: 'div' })
  })

  it('recovers tag/variants/preset exactly (as literals — `const O` preserves them), via the ContractXOf accessors', () => {
    const boxContract = defineContract({ tag: 'div', name: 'Box' })
    expectTypeOf<ContractTagOf<typeof boxContract>>().toEqualTypeOf<'div'>()

    const buttonContract = defineContract({
      tag: 'button',
      name: 'Button',
      styling: {
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        presets: { cta: { size: 'lg' } },
      },
    })
    expectTypeOf<ContractTagOf<typeof buttonContract>>().toEqualTypeOf<'button'>()
    expectTypeOf<ContractVariantsOf<typeof buttonContract>>().toEqualTypeOf<{
      readonly size: { readonly sm: 'text-sm'; readonly lg: 'text-lg' }
    }>()
    expectTypeOf<ContractPresetOf<typeof buttonContract>>().toEqualTypeOf<{
      readonly cta: { readonly size: 'lg' }
    }>()
  })
})

/**
 * `ContractPropsOf<C>` — documenting a real, load-bearing limitation found while writing these
 * tests, not a defineContract bug: `FactoryOptions.defaults` is declared as
 * `Partial<NoInfer<Props>>`, and `NoInfer` blocks that occurrence from contributing to *any*
 * infer-based extraction of `Props` (not just call-site inference) — so `ContractPropsOf<C>`
 * cannot recover a component's own props from `defaults` alone, only from `onElement`'s
 * `getProps` (the one `Props`-bearing field FactoryOptions does *not* wrap in `NoInfer`). Most
 * contracts declare props via `defaults`, not `onElement`, so `ContractPropsOf<C>` alone is not a
 * reliable general-purpose Props-recovery mechanism for an arbitrary already-built `C`.
 *
 * This does not block Phase 1 (defineContract has no `Props`-recovery responsibility — see its own
 * doc comment) but is a real finding for Phase 2/3: `createContractComponent` must keep inferring
 * `Props` fresh at its own call site (the same unblocked mechanism `defaults` already relies on
 * today), and retain that resolved `Props` explicitly alongside `__contract` — not assume
 * `ContractPropsOf<C>` can re-derive it later from an opaque retained `C`.
 */
describe.todo('ContractPropsOf — known limitation: cannot recover Props from `defaults` alone (NoInfer)')
