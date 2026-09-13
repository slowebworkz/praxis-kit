/**
 * Compile-time round-trip tests for the `ContractXOf<C>` accessor family and the
 * `ContractGenericsOf`/`ContractGenericsWithAllowedOf` projections built on top of them.
 *
 * This is the load-bearing assumption for the rest of the `defineContract` refactor: every later
 * phase (per-adapter `createContractComponent`, the `__contract` retention marker, `ContractProps`)
 * depends on these accessors recovering the *exact* type argument a contract was defined with, not
 * an approximation of it. If this file's assertions ever fail, the bug is here, not downstream.
 *
 * Two paths are tested, matching `contract-of.ts`'s own two-path design:
 * 1. **Marker path** — a contract shaped like `defineContract`'s real return value (`O &
 *    HasContractModel<M>`). This is what real, `defineContract`-authored contracts look like; the
 *    accessors read `M` directly, no ambiguity possible.
 * 2. **Fallback path** — a *real object literal* (not a bare `FactoryOptions<...>` generic-alias
 *    instantiation, which would make every field optional per `FactoryOptions`'s own declaration
 *    and defeat the required-pattern-match fallback entirely) with no marker at all, matching a
 *    raw literal handed straight to `createContractComponent` without going through
 *    `defineContract` first.
 *
 * No runtime assertions are made. These tests exist to catch type regressions.
 */
import { describe, expectTypeOf, it } from 'vitest'
import type { ClassPluginFactory } from '../class'
import type { ElementType, EmptyRecord } from '../primitives'
import type { PolymorphicGenerics } from '../variants'
import type { FactoryOptions } from './factory-options'
import type { ContractModel, HasContractModel } from './contract-model'
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

describe("ContractXOf — marker path: recovers a defineContract-shaped contract's model exactly", () => {
  type TestContract = FactoryOptions<
    'button',
    TestProps,
    TestVariants,
    TestPreset,
    TestPlugin,
    TestAllowed
  > &
    HasContractModel<
      ContractModel<'button', TestProps, TestVariants, TestPreset, TestPlugin, TestAllowed>
    >

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

describe('ContractXOf — fallback path: a real literal, no defineContract marker', () => {
  it('recovers tag exactly, and falls back to tight empty defaults for everything absent', () => {
    const plain = { tag: 'div', name: 'Plain' } as const
    void plain
    expectTypeOf<ContractTagOf<typeof plain>>().toEqualTypeOf<'div'>()
    expectTypeOf<ContractPropsOf<typeof plain>>().toEqualTypeOf<EmptyRecord>()
    expectTypeOf<ContractVariantsOf<typeof plain>>().toEqualTypeOf<Readonly<EmptyRecord>>()
    expectTypeOf<ContractPresetOf<typeof plain>>().toEqualTypeOf<Readonly<EmptyRecord>>()
    expectTypeOf<ContractAllowedOf<typeof plain>>().toEqualTypeOf<ElementType>()
  })

  it('recovers variants/presets/plugin/allowed exactly when a real literal sets them', () => {
    const full = {
      tag: 'button',
      name: 'Button',
      defaults: { href: '#' },
      styling: {
        variants: { size: { sm: 'text-sm', lg: 'text-lg' } },
        presets: { cta: { size: 'lg' } },
      },
      enforcement: { allowedAs: ['a', 'button'] },
    } as const
    void full
    expectTypeOf<ContractTagOf<typeof full>>().toEqualTypeOf<'button'>()
    expectTypeOf<ContractVariantsOf<typeof full>>().toEqualTypeOf<{
      readonly size: { readonly sm: 'text-sm'; readonly lg: 'text-lg' }
    }>()
    expectTypeOf<ContractPresetOf<typeof full>>().toEqualTypeOf<{
      readonly cta: { readonly size: 'lg' }
    }>()
    expectTypeOf<ContractAllowedOf<typeof full>>().toEqualTypeOf<'a' | 'button'>()
    // Props: best-effort only, widened back to `string` from the literal `'#'` this `const`
    // literal actually infers, and optional — see ExtractContractProps's own doc comment for why:
    // `defaults` supplies a default value, which is by definition optional to the caller.
    expectTypeOf<ContractPropsOf<typeof full>>().toEqualTypeOf<{ readonly href?: string }>()
  })
})
