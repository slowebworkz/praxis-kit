import { describe, it, expectTypeOf } from 'vitest'
import type { HasContract } from './has-contract'

/**
 * Validation spike for the `docs/design/compose-props-typing.md` proposal (finding #54 in
 * `praxis-components`' `PRAXIS-KIT-FINDINGS.md`): can a composing component's extracted props
 * type automatically fold in `compose.with`'s own contract-derived props when `allProps: true`,
 * reusing the existing `HasContract`/`__contract` recovery mechanism this package already ships —
 * with no new runtime mechanism and no change to any adapter's callable signature.
 *
 * Self-contained and dependency-free, matching this package's own `has-contract.test.ts`/
 * `has-generics.test.ts` convention: `@praxis-kit/contract-props` deliberately has no dependency
 * on `@praxis-kit/primitive`/`@praxis-kit/core`, so every shape below is a minimal mock rather than
 * a real `FactoryOptions`/`PolymorphicGenerics` import. Where the real implementation should live
 * (this package, a new shared package, or duplicated per adapter) is an open question the design
 * doc raises and this spike doesn't need to answer — it only has to prove the type mechanics work.
 *
 * Not covered here (adapter-specific, validated at the real implementation site instead): mode
 * extraction (`ContractProps<T, 'asChild' | 'render'>`) and `as`/polymorphism interaction, both of
 * which depend on each adapter's own `PolymorphicProps`/`PolymorphicWithAsChild` types that this
 * dependency-free package never imports.
 */

/** Minimal stand-in for a defined contract — just enough shape to exercise composition. */
interface MockContract<
  TProps = Record<string, never>,
  TVariants = Record<string, never>,
  TCompose = never,
> {
  props: TProps
  variants: TVariants
  compose: TCompose
}

/** Minimal stand-in for `ComposeOptions` — `with` is an arbitrary callable, mirroring the real
 *  type's deliberately untrusted `ComponentReference`. */
interface MockCompose<TWith> {
  allProps: true
  with: TWith
}

type MockComponent<C> = HasContract<C> & ((props: Record<string, unknown>) => unknown)

/** Recovers `T`'s own retained contract if `T` carries `__contract` (`HasContract<C>`); `never`
 *  for anything else — `compose.with` must degrade gracefully for a non-praxis-kit reference. */
type RecoveredContractOf<T> = T extends HasContract<infer C> ? C : never

/** `C`'s composed partner's contract, or `never` if `C` doesn't compose, composition isn't
 *  `allProps`, or `with` isn't a recognizable praxis-kit component. */
type ComposedContractOf<C> = C extends { compose: { allProps: true; with: infer W } }
  ? RecoveredContractOf<W>
  : never

type PropsOfContract<C> = C extends { props: infer P } ? P : Record<string, never>
type VariantsOfContract<C> = C extends { variants: infer V } ? V : Record<string, never>

/** Type-level mirror of `classifyProp` (`lib/adapter-utils/src/slot/merge-slot-props.ts`) — keyed
 *  by the same special-cased names plus the event-handler naming convention; everything else
 *  `'child-wins'`. Approximates `EVENT_HANDLER_RE` with the `on${string}` key-name pattern, since
 *  the real check also inspects whether both sides' *values* are functions — a distinction types
 *  can't make at this generic a level. Acceptable here because every real contract-authored
 *  handler prop is typed as a function on both sides; flagged in the design doc as a known
 *  simplification, not silently assumed. */
type ClassifyPropKey<K extends PropertyKey> = K extends 'className' | 'class'
  ? 'concat'
  : K extends 'style'
    ? 'shallow-merge'
    : K extends `on${string}`
      ? 'chain'
      : 'child-wins'

type CollisionError<K extends PropertyKey> =
  `compose: '${K & string}' is declared by both this component and its composed partner with incompatible types`

/** Own-vs-composed key merge, resolved per `ClassifyPropKey`. `chain`/`concat`/`shallow-merge`
 *  keys are safe to coexist (the runtime combinator makes sense for two different values); a
 *  `child-wins` key present on both sides with incompatible types surfaces as `CollisionError`
 *  instead of silently picking a direction. */
type MergeComposedProps<Own, Composed> = {
  [K in keyof Own | keyof Composed]: K extends keyof Own
    ? K extends keyof Composed
      ? ClassifyPropKey<K> extends 'child-wins'
        ? Own[K] extends Composed[K]
          ? Own[K]
          : Composed[K] extends Own[K]
            ? Composed[K]
            : CollisionError<K>
        : Own[K] | Composed[K]
      : Own[K]
    : K extends keyof Composed
      ? Composed[K]
      : never
}

type OwnGenericsOf<C> = { props: PropsOfContract<C>; variants: VariantsOfContract<C> }

/**
 * The composed props+variants `ContractProps<T>` would need — `C`'s own, with its composed
 * partner's folded in, falling back to `C`'s own untouched shape when there's nothing to compose,
 * so a non-composing contract's extracted type is provably unchanged.
 *
 * Deliberately recurses on **`ContractGenericsWithComposeOf<CC>`** for the composed partner, not
 * on `CC`'s own raw, undecorated contract (`OwnGenericsOf<CC>`) — step 5 below proves why that
 * distinction matters: if `Surface` itself composes a third component, projecting `CC`'s raw
 * contract would silently drop that third component's props from `Card`'s own resolved type —
 * each level would need its own bespoke re-derivation rather than nesting falling out of one
 * recursive definition for free, contradicting this proposal's own claim that recursion is close
 * to free. Recursing on the already-composed result instead makes a single definition correct at
 * every depth, bounded naturally by the real, finite chain of `compose.with` references (no
 * artificial depth cap needed).
 */
type ContractGenericsWithComposeOf<C> =
  ComposedContractOf<C> extends infer CC
    ? [CC] extends [never]
      ? OwnGenericsOf<C>
      : {
          props: MergeComposedProps<PropsOfContract<C>, ContractGenericsWithComposeOf<CC>['props']>
          variants: MergeComposedProps<
            VariantsOfContract<C>,
            ContractGenericsWithComposeOf<CC>['variants']
          >
        }
    : never

describe('ContractGenericsWithComposeOf against mocked contracts', () => {
  it('step 1 — no composition: resolves to exactly the contract’s own props/variants', () => {
    type Card = MockContract<{ variant: 'elevated' | 'flat' }, { size: 'sm' | 'lg' }>

    type Resolved = ContractGenericsWithComposeOf<Card>

    expectTypeOf<Resolved>().toEqualTypeOf<{
      props: { variant: 'elevated' | 'flat' }
      variants: { size: 'sm' | 'lg' }
    }>()
  })

  it('step 2 — allProps: true folds the composed partner’s props/variants in', () => {
    type SurfaceContract = MockContract<{ radius: 'sm' | 'lg' }, { shadow: boolean }>
    type Surface = MockComponent<SurfaceContract>
    type Card = MockContract<
      { variant: 'elevated' | 'flat' },
      { size: 'sm' | 'lg' },
      MockCompose<Surface>
    >

    type Resolved = ContractGenericsWithComposeOf<Card>

    expectTypeOf<Resolved>().toEqualTypeOf<{
      props: { variant: 'elevated' | 'flat'; radius: 'sm' | 'lg' }
      variants: { size: 'sm' | 'lg'; shadow: boolean }
    }>()
  })

  it('step 2b — without allProps, the composed partner’s props stay unreachable', () => {
    type SurfaceContract = MockContract<{ radius: 'sm' | 'lg' }>
    type Surface = MockComponent<SurfaceContract>
    // No `compose` field at all — the "not composing" case, same shape `FactoryOptions.compose`
    // being optional produces for a real contract that never sets it.
    type Card = MockContract<{ variant: 'elevated' | 'flat' }>

    type Resolved = ContractGenericsWithComposeOf<Card>

    expectTypeOf<Resolved>().toEqualTypeOf<{
      props: { variant: 'elevated' | 'flat' }
      variants: Record<string, never>
    }>()
    expectTypeOf<keyof Resolved['props']>().not.toEqualTypeOf<'radius'>()
    void (undefined as unknown as Surface)
  })

  it('step 4 — a same-named child-wins prop with incompatible types surfaces as CollisionError', () => {
    type SurfaceContract = MockContract<{ variant: 'raised' | 'sunken' }>
    type Surface = MockComponent<SurfaceContract>
    type Card = MockContract<
      { variant: 'elevated' | 'flat' },
      Record<string, never>,
      MockCompose<Surface>
    >

    type Resolved = ContractGenericsWithComposeOf<Card>

    expectTypeOf<Resolved['props']['variant']>().toEqualTypeOf<CollisionError<'variant'>>()
  })

  it('step 5 — nested composition resolves transitively through the partner’s own __contract', () => {
    type BaseContract = MockContract<{ as: 'div' | 'span' }>
    type Base = MockComponent<BaseContract>
    type SurfaceContract = MockContract<
      { radius: 'sm' | 'lg' },
      Record<string, never>,
      MockCompose<Base>
    >
    type Surface = MockComponent<SurfaceContract>
    type Card = MockContract<
      { variant: 'elevated' | 'flat' },
      Record<string, never>,
      MockCompose<Surface>
    >

    // Surface composes Base, and Card composes Surface — Card's own resolved type must include
    // Base's `as` prop too, not just Surface's direct `radius`. Only holds because
    // `ContractGenericsWithComposeOf` recurses on the composed partner's *own already-composed*
    // result (see that type's own comment) rather than its raw contract.
    type Resolved = ContractGenericsWithComposeOf<Card>

    expectTypeOf<Resolved>().toEqualTypeOf<{
      props: { variant: 'elevated' | 'flat'; radius: 'sm' | 'lg'; as: 'div' | 'span' }
      variants: Record<string, never>
    }>()
  })
})
