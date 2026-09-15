/**
 * Compile-time type contract tests for `ContractProps<T>` / `GenericsOf<T>` — the Lit analog of
 * `adapters/preact/src/contract-props.test.tsx` (React has the same shape too). Lit has no
 * `asChild`/`render` mode (see the "known limitations" note atop `conformance.test.ts`), so unlike
 * those two adapters there is no `Mode` parameter here, and no asChild-mode section below.
 *
 * `createContractComponent`'s return type erases `TDefault`/`Props`/`TPreset` entirely — nothing
 * short of the phantom `__contract` marker on `LitContractComponent` (`./types/primitives`) could
 * recover them from outside this file. `GenericsOf<T>`/`ContractProps<T>` derive `G` from
 * `__contract` via `ContractGenericsOf<C>` (Phase 4 of the `defineContract` refactor — was a
 * separately-computed `__generics` field that never folded in plugin-contributed props; see
 * `./types/contract-props.ts`'s own doc comment). These tests exist to catch a regression in that
 * recovery, not to re-test `PropsOf`/`VariantProps`/etc. themselves (covered in `@praxis-kit/core`).
 * Checks are written as direct indexed/accessor comparisons rather than whole-object structural
 * matches — `ContractProps<T>` always carries `recipe` alongside the custom props, so matching
 * against a partial object shape would either miss that field or have to keep re-declaring it here.
 *
 * No runtime assertions are made — `expectTypeOf` only.
 */
import { describe, it, expectTypeOf } from 'vitest'
import type { ClassPluginFactory, DefaultOf, EmptyRecord, PropsOf } from '@praxis-kit/core'
import { createContractComponent } from './create-contract-component'
import type { ContractProps, GenericsOf } from './types'

const buttonVariants = { intent: { primary: 'btn-primary', ghost: 'btn-ghost' } } as const

// `loading` is recovered from `defaults` (`ContractPropsOf<C>`, Phase 0/1 of the `defineContract`
// refactor), not from an explicit `TProps` generic argument — `createContractComponent` dropped
// that parameter entirely (see its own doc comment / DECISIONS.md: no real call site ever supplied
// `Props` alone, and `const O`'s literal-preserving inference only engages with zero explicit type
// arguments). `false` is widened to `boolean` by `ContractPropsFrom`'s own `WidenShallow` step —
// a *default* value, not the only legal one.
const Button = createContractComponent({
  tag: 'button',
  name: 'SpikeButton',
  styling: { base: 'btn-base', variants: buttonVariants, defaults: { intent: 'ghost' } },
  defaults: { loading: false },
})

const Header = createContractComponent({ tag: 'header', name: 'SpikeCardHeader' })

const Card = createContractComponent({
  tag: 'section',
  name: 'SpikeCard',
  subComponents: { Header },
})

// Unlike React/Preact's JSX-based type tests, nothing here renders — every
// assertion below is `typeof Button`/`typeof Card` in a type position only.
void Button
void Card

describe('GenericsOf', () => {
  it('recovers the PolymorphicGenerics a component was built from', () => {
    expectTypeOf<PropsOf<GenericsOf<typeof Button>>>().toEqualTypeOf<{ loading?: boolean }>()
    expectTypeOf<DefaultOf<GenericsOf<typeof Button>>>().toEqualTypeOf<'button'>()
  })

  // No "falls back to the widest PolymorphicGenerics for a value with no marker" test here anymore
  // (there was one, against a bare `object`, under the old `HasGenerics<PolymorphicGenerics>`
  // constraint). `GenericsOf<T>` now goes through `HasContract<FactoryOptions>` /
  // `ContractGenericsOf<C>` (Phase 4), and `object` structurally satisfies `HasContract`'s
  // optional `__contract` field the same way it satisfied `HasGenerics`'s optional `__generics` —
  // but the positional-`infer`-against-an-absent-optional-field limitation documented on
  // `ContractModelOf` (`@praxis-kit/primitive`) means the recovered `C` resolves to the *declared
  // constraint* `FactoryOptions`, not a "nothing to recover" empty case, so the projected `G` no
  // longer lines up with bare `PolymorphicGenerics` field-for-field. This is the same accepted,
  // documented limitation `HasContractModel.__model` was made *required* specifically to avoid —
  // `HasContract.__contract` stays optional on purpose (matching `HasGenerics`), so this exact
  // corner (a value with no marker declared *at all*, not merely one with an empty contract) isn't
  // asserted here. No adapter's already-migrated `ContractProps`/`GenericsOf` tests (React/Preact/
  // Vue/Solid) assert this either — real components always carry the field.
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

  it('has no `as` — unlike every VDOM adapter, Lit has no tag polymorphism to type', () => {
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
    // Mirrors React's/Preact's own synthetic plugin fixture in their `contract-props.test.tsx`
    // (a real dependency on `@praxis-kit/tailwind` isn't worth adding here just for this).
    // Before Phase 4, `GenericsOf`/`ContractProps` read the separately-computed `__generics` field
    // (`RuntimeG<TDefault, Props, Variants, TPreset>`), which never had a `TPlugin` parameter at
    // all — plugin props reached the *instance* type (`LitContractComponent`'s own `TPluginProps`
    // parameter) but never `ContractProps`. Routing through `__contract`/`ContractGenericsOf<C>`
    // (which folds `ExtractPluginProps<TPlugin>` into `props` once, pre-flattened) fixes this.
    type PluginProps = { readonly highlighted?: boolean }
    const stubPlugin = (() => ({ pipeline: () => '' })) as unknown as ClassPluginFactory<PluginProps>

    const Chip = createContractComponent({
      tag: 'span',
      name: 'Chip',
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
      name: 'SlottedButton',
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
