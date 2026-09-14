/**
 * Compile-time type contract tests for `ContractProps<T>` / `GenericsOf<T>` — identical in shape to
 * `adapters/lit/src/contract-props.test.ts`, since the Web adapter builds the same fixed-identity
 * custom element with the same erased return type. No `asChild`/`render` mode (see the "known
 * limitations" note atop `conformance.test.ts`), so no `Mode` parameter and no asChild-mode section.
 *
 * `createContractComponent`'s return type erases `TDefault`/`TProps`/`TPreset` entirely — nothing
 * short of the phantom `__contract` marker on `WebContractComponent` (`./types/primitives`) could
 * recover them from outside this file. `GenericsOf<T>`/`ContractProps<T>` derive `G` from
 * `__contract` via `ContractGenericsOf<C>` (Phase 4 of the `defineContract` refactor — was a
 * separately-computed `__generics` field that never folded in plugin-contributed props; see
 * `./types/contract-props.ts`'s own doc comment). These tests exist to catch a regression in that
 * recovery, not to re-test `PropsOf`/`VariantProps`/etc. themselves (covered in `@praxis-kit/core`).
 *
 * No runtime assertions are made — `expectTypeOf` only.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { ClassPluginFactory, DefaultOf, EmptyRecord, PropsOf } from '@praxis-kit/core'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, GenericsOf } from './types'

const buttonVariants = { intent: { primary: 'btn-primary', ghost: 'btn-ghost' } } as const

// `loading` is recovered from `defaults` (`ContractPropsOf<C>`), not an explicit `TProps` generic
// argument — `createContractComponent` dropped that parameter entirely, mirroring the Lit adapter's
// identical fix (see that adapter's own `contract-props.test.ts` for the full reasoning). `false`
// is widened to `boolean` by `ExtractContractProps`'s own `WidenShallow` step.
const Button = createContractComponent({
  tag: 'button',
  name: 'WebContractPropsButton',
  styling: { base: 'btn-base', variants: buttonVariants, defaults: { intent: 'ghost' } },
  defaults: { loading: false },
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
    expectTypeOf<PropsOf<GenericsOf<typeof Button>>>().toEqualTypeOf<{ loading?: boolean }>()
    expectTypeOf<DefaultOf<GenericsOf<typeof Button>>>().toEqualTypeOf<'button'>()
  })

  // No "falls back to the widest PolymorphicGenerics for a value with no marker" test here — see
  // the Lit adapter's identical, more-detailed comment in its own `contract-props.test.ts` for why
  // this specific edge case (a value with no `__contract` field declared *at all*) isn't asserted
  // post-Phase-4: `object` structurally satisfies `HasContract`'s optional field either way, but
  // the positional-`infer`-against-an-absent-optional-field limitation on `ContractModelOf` means
  // the recovered `C` resolves to the declared constraint `FactoryOptions`, not a clean "nothing to
  // recover" case. No other migrated adapter's tests assert this either — real components always
  // carry the field.
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

  it('includes plugin-contributed props (finding #44 — previously missing entirely for Lit/Web)', () => {
    // Mirrors the Lit adapter's identical fixture/regression test — see that adapter's own
    // `contract-props.test.ts` for the full before/after explanation.
    type PluginProps = { readonly highlighted?: boolean }
    const stubPlugin = (() => ({ pipeline: () => '' })) as unknown as ClassPluginFactory<PluginProps>

    const Chip = createContractComponent({
      tag: 'span',
      name: 'WebChip',
      styling: { base: 'chip-base', plugin: stubPlugin },
    })
    void Chip

    expectTypeOf<ContractProps<typeof Chip>['highlighted']>().toEqualTypeOf<boolean | undefined>()
  })

  it('passes data-* attributes through (finding #43)', () => {
    // `_buildProps()` scans every attribute off the custom element into the pipeline, so a
    // `data-*` a contract sets in `defaults` — `data-slot`, the styling hook — is real,
    // forwarded input and must be typeable through `ContractProps`.
    const Slotted = createContractComponent({
      tag: 'button',
      name: 'WebSlottedButton',
      defaults: { 'data-slot': 'slotted-button' },
    })
    void Slotted

    expectTypeOf<ContractProps<typeof Slotted>['data-slot']>().toEqualTypeOf<
      string | number | boolean | undefined
    >()
    // An arbitrary data-* the contract never names is still accepted.
    expectTypeOf<ContractProps<typeof Slotted>['data-testid']>().toEqualTypeOf<
      string | number | boolean | undefined
    >()

    const props: ContractProps<typeof Slotted> = { 'data-slot': 'override' }
    void props
  })
})
