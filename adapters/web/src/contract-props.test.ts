/**
 * Compile-time type contract tests for `ContractProps<T>` / `GenericsOf<T>` — identical in shape to
 * `adapters/lit/src/contract-props.test.ts`, since the Web adapter builds the same fixed-identity
 * custom element with the same erased return type. No `asChild`/`render` mode (see the "known
 * limitations" note atop `conformance.test.ts`), so no `Mode` parameter and no asChild-mode section.
 *
 * `createContractComponent`'s return type erases `TDefault`/`TProps`/`TPreset` entirely — nothing
 * short of the phantom `__generics` marker on `WebContractComponent` (`./types/primitives`) could
 * recover them from outside this file. These tests exist to catch a regression in that recovery,
 * not to re-test `PropsOf`/`VariantProps`/etc. themselves (covered in `@praxis-kit/core`).
 *
 * No runtime assertions are made — `expectTypeOf` only.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { DefaultOf, EmptyRecord, PolymorphicGenerics, PropsOf } from '@praxis-kit/core'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, GenericsOf } from './types'

type ButtonProps = { readonly loading?: boolean }

const buttonVariants = { intent: { primary: 'btn-primary', ghost: 'btn-ghost' } } as const

const Button = createContractComponent<'button', ButtonProps, typeof buttonVariants>({
  tag: 'button',
  name: 'WebContractPropsButton',
  styling: { base: 'btn-base', variants: buttonVariants, defaults: { intent: 'ghost' } },
})

const Header = createContractComponent({ tag: 'header', name: 'WebContractPropsCardHeader' })

const Card = createContractComponent({
  tag: 'section',
  name: 'WebContractPropsCard',
  subComponents: { Header },
})

// Nothing here renders — every assertion below is `typeof Button`/`typeof Card` in a type position.
void Button
void Card

describe('GenericsOf', () => {
  it('recovers the PolymorphicGenerics a component was built from', () => {
    expectTypeOf<PropsOf<GenericsOf<typeof Button>>>().toEqualTypeOf<ButtonProps>()
    expectTypeOf<DefaultOf<GenericsOf<typeof Button>>>().toEqualTypeOf<'button'>()
  })

  it('falls back to the widest PolymorphicGenerics for a value with no marker', () => {
    // `{}` structurally satisfies `HasGenerics<PolymorphicGenerics>` — `__generics` is optional —
    // the same "no marker, nothing to recover" case documented on the type itself.
    expectTypeOf<GenericsOf<object>>().toEqualTypeOf<PolymorphicGenerics>()
  })
})

describe('ContractProps', () => {
  it('recovers the custom props declared via TProps', () => {
    expectTypeOf<ContractProps<typeof Button>['loading']>().toEqualTypeOf<boolean | undefined>()
  })

  it('recovers variant props declared via the styling.variants map', () => {
    expectTypeOf<ContractProps<typeof Button>['intent']>().toEqualTypeOf<
      'primary' | 'ghost' | undefined
    >()
  })

  it('has no `as` — a custom element has no tag polymorphism to type', () => {
    // A custom element's tag is fixed at customElements.define() time; `as` can't change it.
    // The declared property type is `never` (read back here as `undefined`, since an optional
    // property's read type is always `T | undefined` — `never | undefined` collapses to
    // `undefined`), which is what makes *assigning* `as` a compile error below, matching
    // createContractComponent's runtime behavior of filtering `as` out unconditionally.
    expectTypeOf<ContractProps<typeof Button>['as']>().toEqualTypeOf<undefined>()

    const props: ContractProps<typeof Button> = { loading: true, intent: 'primary' }
    // @ts-expect-error — `as` is declared `never`; no value satisfies it.
    props.as = 'a'
    void props
  })

  it("resolves the root's own props on a compound component, unaffected by subComponents", () => {
    expectTypeOf<PropsOf<GenericsOf<typeof Card>>>().toEqualTypeOf<EmptyRecord>()
    expectTypeOf<ContractProps<typeof Card>['as']>().toEqualTypeOf<undefined>()
  })
})
