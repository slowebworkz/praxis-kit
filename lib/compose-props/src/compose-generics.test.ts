import { describe, it, expectTypeOf } from 'vitest'
import type { OmitIndexSignature } from 'type-fest'
import type { FactoryOptions, PolymorphicGenerics, PropsOf, VariantsOf } from '@praxis-kit/primitive'
import type { HasContract } from '@praxis-kit/contract-props'
import type { ContractGenericsWithComposeOf } from './compose-generics'
import type { CollisionError } from './merge-policy'

/**
 * `ContractPropsOf`/`DeclaredPropsFrom` (`@praxis-kit/primitive`) deliberately intersects a
 * declared props shape with `AnyRecord`, and this package's own `Readonly<VariantMap>`
 * intersection (`compose-generics.ts`) does the same for variants — both add an index signature
 * that every adapter's real `ContractProps<T>` already strips via `OmitIndexSignature`
 * (`adapters/*\/src/.../polymorphic-props.ts`) before exposing props to a consumer. Mirror that
 * here so these assertions compare against what a real consumer actually sees, not the
 * intermediate index-signature-carrying shape. */
type Own<T> = OmitIndexSignature<T>
type OwnProps<G extends PolymorphicGenerics> = Own<PropsOf<G>>
type OwnVariants<G extends PolymorphicGenerics> = Own<VariantsOf<G>>

/**
 * Real-contract-shaped validation for `ContractGenericsWithComposeOf` — the mocked version of
 * these same assertions already ran in `lib/contract-props/src/compose-generics.spike.test.ts`
 * (dependency-free, mocked `FactoryOptions`/`ComposeOptions` stand-ins). This package *does*
 * depend on `@praxis-kit/primitive`, so these fixtures use the real `FactoryOptions`/
 * `ContractModelOf` derivation path instead of a mock: `props`/`styling.variants` declared
 * directly on a raw literal, read back via `ContractModelFrom`'s fallback (no `defineContract`
 * call needed — that derivation is purely structural, see `contract-model.ts`).
 *
 * Not covered here (adapter-specific — see `docs/design/compose-props-typing.md`, section 7):
 * mode extraction (`ContractProps<T, 'asChild' | 'render'>`) and `as`/polymorphism interaction,
 * both of which depend on adapter types this dependency-light package never imports.
 */

/** A value shaped like `ComposeOptions['with']` (a loose `ComponentReference`) that also carries
 *  `__contract`, i.e. a stand-in for a real built praxis-kit component. */
type BuiltComponent<C> = HasContract<C> & ((props: Record<string, unknown>) => unknown)

const surfaceContract = {
  tag: 'div',
  name: 'Surface',
  props: undefined as unknown as { radius: 'sm' | 'lg' },
  styling: { variants: { shadow: { true: 'shadow-sm', false: 'shadow-none' } } },
} satisfies FactoryOptions
type SurfaceContract = typeof surfaceContract
type Surface = BuiltComponent<SurfaceContract>
void surfaceContract

const baseContract = {
  tag: 'div',
  name: 'Base',
  props: undefined as unknown as { as: 'div' | 'span' },
} satisfies FactoryOptions
type BaseContract = typeof baseContract
type Base = BuiltComponent<BaseContract>
void baseContract

describe('ContractGenericsWithComposeOf against real FactoryOptions-shaped contracts', () => {
  it('step 1 — no composition: resolves to exactly the contract’s own props/variants', () => {
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant: 'elevated' | 'flat' },
      styling: { variants: { size: { sm: 'text-sm', lg: 'text-lg' } } },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<OwnProps<Resolved>>().toEqualTypeOf<{ variant: 'elevated' | 'flat' }>()
    expectTypeOf<OwnVariants<Resolved>>().toEqualTypeOf<{ size: { sm: string; lg: string } }>()
  })

  it('step 2 — allProps: true folds the composed partner’s props/variants in', () => {
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant: 'elevated' | 'flat' },
      compose: { allProps: true, with: {} as Surface },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<OwnProps<Resolved>>().toEqualTypeOf<{
      variant: 'elevated' | 'flat'
      radius: 'sm' | 'lg'
    }>()
    expectTypeOf<OwnVariants<Resolved>>().toEqualTypeOf<{
      shadow: { true: string; false: string }
    }>()
  })

  it('step 2b — without allProps (or no compose at all), the partner’s props stay unreachable', () => {
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant: 'elevated' | 'flat' },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<OwnProps<Resolved>>().toEqualTypeOf<{ variant: 'elevated' | 'flat' }>()
    expectTypeOf<keyof OwnProps<Resolved>>().not.toEqualTypeOf<'radius'>()
    void (undefined as unknown as Surface)
  })

  it('step 4 — a same-named child-wins prop with incompatible types surfaces as CollisionError', () => {
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { radius: 'thin' | 'thick' },
      compose: { allProps: true, with: {} as Surface },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<PropsOf<Resolved>['radius']>().toEqualTypeOf<CollisionError<'radius'>>()
  })

  it('design decision — collision validation is a downstream diagnostic, not declaration-site rejection, and this is intentional', () => {
    // This is a locked-in decision, not an unverified gap: declaration-site rejection would
    // require weaving collision detection into createContractComponent's own parameter type —
    // every component's call to the factory, not just composing ones, would need to cross-check
    // against compose.with's contract — a materially bigger, differently-shaped change than this
    // package's scope, and a stronger guarantee than the runtime itself provides (ComposeOptions's
    // own doc comment states collision safety is advisory, not enforced, at the runtime level
    // either). See docs/design/compose-props-typing.md, section 5/8.
    //
    // The three facts below are the actual, chosen contract. If a future change makes any of
    // them fail, that's either a real regression or a deliberate decision to adopt eager
    // rejection instead — either way, this test should be updated consciously, not silently.
    const surfaceContract = {
      tag: 'div',
      name: 'Surface',
      props: undefined as unknown as { radius: 'sm' | 'lg' },
    } satisfies FactoryOptions
    type SurfaceContract = typeof surfaceContract
    type SurfaceComponent = BuiltComponent<SurfaceContract>

    // (1) The declaration itself always type-checks, collision or not -- no @ts-expect-error
    // is needed anywhere on this object despite `radius` colliding with Surface's incompatible
    // 'sm' | 'lg'.
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { radius: 'thin' | 'thick' },
      compose: { allProps: true, with: {} as SurfaceComponent },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    type Resolved = ContractGenericsWithComposeOf<CardContract>

    // (2) The collision is recorded as a diagnostic value at that one key...
    expectTypeOf<PropsOf<Resolved>['radius']>().toEqualTypeOf<CollisionError<'radius'>>()

    // (3) ...but a consumer who never reads that specific key sees no error at all, and every
    // other key on the composed type remains fully usable.
    function consumesEverythingExceptRadius(props: Omit<PropsOf<Resolved>, 'radius'>): void {
      void props
    }
    consumesEverythingExceptRadius({})
  })

  it('step 5 — nested composition resolves transitively through the partner’s own __contract', () => {
    const surfaceComposingBaseContract = {
      tag: 'div',
      name: 'Surface',
      props: undefined as unknown as { radius: 'sm' | 'lg' },
      compose: { allProps: true, with: {} as Base },
    } satisfies FactoryOptions
    type SurfaceComposingBaseContract = typeof surfaceComposingBaseContract
    type SurfaceComposingBase = BuiltComponent<SurfaceComposingBaseContract>
    void surfaceComposingBaseContract

    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant: 'elevated' | 'flat' },
      compose: { allProps: true, with: {} as SurfaceComposingBase },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    // Surface composes Base, and Card composes Surface — Card's own resolved type must include
    // Base's `as` prop too, not just Surface's direct `radius`.
    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<OwnProps<Resolved>>().toEqualTypeOf<{
      variant: 'elevated' | 'flat'
      radius: 'sm' | 'lg'
      as: 'div' | 'span'
    }>()
  })

  it('risk check — an untrusted, non-praxis-kit `with` degrades to no composed props at all', () => {
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant: 'elevated' | 'flat' },
      // A plain function with no __contract — `compose.with` is deliberately untyped at this
      // level (`ComponentReference`), so an arbitrary non-praxis-kit callable must be accepted
      // by the type without producing a composed surface from it.
      compose: { allProps: true, with: (() => {}) as (props: unknown) => unknown },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<OwnProps<Resolved>>().toEqualTypeOf<{ variant: 'elevated' | 'flat' }>()
  })

  it('regression — composing does not widen `allowed` (enforcement.allowedAs) to the default ElementType', () => {
    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant: 'elevated' | 'flat' },
      enforcement: { allowedAs: ['article', 'section'] as const },
      compose: { allProps: true, with: {} as Surface },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    // Caught via a real-component test (adapters/react/src/current/compose-props.test.tsx):
    // passing ContractAllowedOf<C> straight through, unguarded, silently widened this field to
    // the full default ElementType (every intrinsic tag) instead of Card's own declared
    // allowedAs — TypeScript falling back to a type parameter's own default rather than erroring,
    // for a generic argument depending on this alias's own self-reference. Every argument to the
    // internal PolymorphicGenerics<...> call is now guarded against exactly this (see
    // compose-generics.ts's own comment) — this test exists so a regression here is caught in
    // this package directly, not only by an adapter three layers away.
    type Resolved = ContractGenericsWithComposeOf<CardContract>

    expectTypeOf<Resolved['allowed']>().toEqualTypeOf<'article' | 'section'>()
  })

  it('regression — merging preserves per-key optionality instead of turning every optional own-prop required-but-undefined', () => {
    const surfaceWithOptional = {
      tag: 'div',
      name: 'Surface',
      props: undefined as unknown as { radius?: 'sm' | 'lg'; required: 'x' | 'y' },
    } satisfies FactoryOptions
    type SurfaceWithOptional = typeof surfaceWithOptional
    type SurfaceOptional = BuiltComponent<SurfaceWithOptional>
    void surfaceWithOptional

    const cardContract = {
      tag: 'article',
      name: 'Card',
      props: undefined as unknown as { variant?: 'elevated' | 'flat' },
      compose: { allProps: true, with: {} as SurfaceOptional },
    } satisfies FactoryOptions
    type CardContract = typeof cardContract
    void cardContract

    // Caught via a real-component test: a naive `{ [K in keyof Own | keyof Composed]: ... }`
    // mapped type isn't homomorphic over a single `keyof T`, so TypeScript doesn't auto-preserve
    // either side's own `?` modifier — every key silently became required-but-possibly-`undefined`
    // instead. Three cases in one fixture: `variant` (optional, Card-only), `radius` (optional,
    // Surface-only), `required` (required, Surface-only) — the last one is the one a naive "absent
    // from Own => always optional" fix would still get wrong.
    type Resolved = ContractGenericsWithComposeOf<CardContract>
    type Props = OwnProps<Resolved>

    expectTypeOf<Props>().toEqualTypeOf<{
      variant?: 'elevated' | 'flat'
      radius?: 'sm' | 'lg'
      required: 'x' | 'y'
    }>()
  })
})
