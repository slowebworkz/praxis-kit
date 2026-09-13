/**
 * Compile-time round-trip tests for the `ContractXOf<C>` accessor family and the
 * `ContractGenericsOf`/`ContractGenericsWithAllowedOf` projections built on top of them.
 *
 * This is the load-bearing assumption for the rest of the `defineContract` refactor: every later
 * phase (per-adapter `createContractComponent`, the `__contract` retention marker, `ContractProps`)
 * depends on these accessors recovering the *exact* type argument a contract was defined with, not
 * an approximation of it. If this file's assertions ever fail, the bug is here, not downstream.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, expectTypeOf, it } from 'vitest'
import type { ElementType, EmptyRecord } from '../primitives'
import type { ClassPluginFactory } from '../class'
import type { PolymorphicGenerics } from '../variants'
import type { FactoryOptions } from './factory-options'
import type {
  ContractAllowedOf,
  ContractPluginOf,
  ContractPresetOf,
  ContractPropsOf,
  ContractTagOf,
  ContractVariantsOf,
} from './contract-of'
import type { ContractGenericsOf, ContractGenericsWithAllowedOf } from './contract-generics'

type TestProps = { readonly href: string }
type TestVariants = { readonly size: { readonly sm: string; readonly lg: string } }
type TestPreset = { readonly cta: { readonly size: 'lg' } }
type TestPlugin = ClassPluginFactory<{ readonly flex?: true }>
type TestAllowed = 'a' | 'button'

type TestContract = FactoryOptions<'button', TestProps, TestVariants, TestPreset, TestPlugin, TestAllowed>

describe('ContractXOf — recovers a concrete contract\'s type arguments exactly', () => {
  it('ContractTagOf', () => {
    expectTypeOf<ContractTagOf<TestContract>>().toEqualTypeOf<'button'>()
  })

  it('ContractPropsOf', () => {
    expectTypeOf<ContractPropsOf<TestContract>>().toEqualTypeOf<TestProps>()
  })

  it('ContractVariantsOf', () => {
    expectTypeOf<ContractVariantsOf<TestContract>>().toEqualTypeOf<TestVariants>()
  })

  it('ContractPresetOf', () => {
    expectTypeOf<ContractPresetOf<TestContract>>().toEqualTypeOf<TestPreset>()
  })

  it('ContractPluginOf', () => {
    expectTypeOf<ContractPluginOf<TestContract>>().toEqualTypeOf<TestPlugin>()
  })

  it('ContractAllowedOf', () => {
    expectTypeOf<ContractAllowedOf<TestContract>>().toEqualTypeOf<TestAllowed>()
  })
})

describe('ContractXOf — falls back to the same widest defaults as FactoryOptions/PolymorphicGenerics', () => {
  it('the widest FactoryOptions bound recovers the widest fallback for every accessor', () => {
    expectTypeOf<ContractTagOf<FactoryOptions>>().toEqualTypeOf<ElementType>()
    expectTypeOf<ContractPropsOf<FactoryOptions>>().toEqualTypeOf<EmptyRecord>()
    expectTypeOf<ContractVariantsOf<FactoryOptions>>().toEqualTypeOf<Readonly<EmptyRecord>>()
    expectTypeOf<ContractPresetOf<FactoryOptions>>().toEqualTypeOf<Readonly<EmptyRecord>>()
    expectTypeOf<ContractAllowedOf<FactoryOptions>>().toEqualTypeOf<ElementType>()
  })
})

describe('ContractGenericsOf / ContractGenericsWithAllowedOf — the canonical G projection', () => {
  it('ContractGenericsOf folds plugin props into props and omits TAllowed', () => {
    expectTypeOf<ContractGenericsOf<TestContract>>().toEqualTypeOf<
      PolymorphicGenerics<'button', TestProps & { readonly flex?: true }, TestVariants, TestPreset>
    >()
  })

  it('ContractGenericsWithAllowedOf additionally threads TAllowed', () => {
    expectTypeOf<ContractGenericsWithAllowedOf<TestContract>>().toEqualTypeOf<
      PolymorphicGenerics<
        'button',
        TestProps & { readonly flex?: true },
        TestVariants,
        TestPreset,
        TestAllowed
      >
    >()
  })
})
