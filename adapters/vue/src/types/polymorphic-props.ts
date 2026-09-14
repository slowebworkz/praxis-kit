import type { AllowedComponentProps } from 'vue'
import type { Simplify } from 'type-fest'
import type {
  ClassName,
  ContractGenericsOf,
  DefaultOf,
  ElementType,
  FactoryOptions,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { HasContract } from '@praxis-kit/contract-props'
import type { UnknownProps } from './primitives'

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = PropsOf<G> &
  VariantProps<VariantsOf<G>> & {
    as?: TAs
    class?: ClassName
    recipe?: keyof RecipeOf<G>
  }

/**
 * Props for the normal (non-slot) render path. `asChild` is absent or `false`.
 *
 * `AllowedComponentProps` adds Vue system props (`key`, `ref`, lifecycle hooks).
 * `UnknownProps` allows HTML attributes that aren't explicitly enumerated.
 */
export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<ControlProps<G, TAs> & AllowedComponentProps & { asChild?: false } & UnknownProps>

/**
 * Props for the slot render path (`asChild: true`). `as` is forbidden — combining
 * `as` with `asChild` is a runtime invariant violation, so it is rejected at the
 * type level too.
 */
export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  ControlProps<G, TAs> &
    AllowedComponentProps & {
      asChild: true
      as?: never
    } & UnknownProps
>

/**
 * A Vue polymorphic component typed for use in templates and JSX via the
 * `new()` instance-constructor pattern that Volar uses for prop checking.
 *
 * Unlike React's overloaded call signatures, Vue has no per-call-site generic
 * inference for `as`, so HTML attribute narrowing based on the `as` value is
 * not available — `UnknownProps` captures the open-ended attribute surface instead.
 */
export type PolymorphicComponent<
  G extends PolymorphicGenerics,
  C extends FactoryOptions = FactoryOptions,
> = {
  new (): {
    $props: PolymorphicProps<G> | PolymorphicWithAsChild<G>
  }
  /**
   * Type-only; never assigned at runtime — same rationale as React's/Preact's `__contract` (see
   * `HasContract<C>`, `@praxis-kit/contract-props`). Carries the *complete* contract this
   * component was built from (`C`, the argument `createContractComponent<C extends
   * VueFactoryOptions>` was actually called with). Unlike `G` (which was already an ordinary,
   * directly-visible type parameter here — Vue's `new()` construct signature has no
   * overload-resolution ceiling forcing a marker the way React's/Preact's overloaded callables
   * do), `C` still needs one: nothing else on this type exposes the *complete* contract, only its
   * `PolymorphicGenerics` projection. Defaults to the widest `FactoryOptions` so every existing
   * one-argument `PolymorphicComponent<G>` reference keeps resolving exactly as before.
   */
  readonly __contract?: C
  displayName?: string
}

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>`'s `new()`
 * constructor signature doesn't disturb it — `Card.Header` and friends are
 * ordinary object properties, not part of the construct signature.
 */
export type CompoundComponent<
  G extends PolymorphicGenerics,
  S extends Readonly<StringMap<PolymorphicGenerics>>,
> = PolymorphicComponent<G> & {
  readonly [K in keyof S]: PolymorphicComponent<S[K]>
}

/**
 * A component's full prop contract, both render modes at once — `PolymorphicComponent<G>`'s
 * single `new()` construct signature already exposes both modes unioned together (`$props:
 * PolymorphicProps<G> | PolymorphicWithAsChild<G>`), so this is that same union, projected from
 * the component's retained `__contract` rather than a bare `G` the caller must already have in
 * hand — `ContractProps<typeof Box>`, matching every other adapter, not `ContractProps<SomeG>`.
 *
 * An earlier version of this type took `G` directly (`ContractProps<G extends
 * PolymorphicGenerics>`) — a genuinely different public shape, not a bug fix here: Vue's `new()`
 * construct signature never had React's/Preact's overload-resolution ceiling, so there was no
 * *forced* reason for a marker. Unified to `ContractProps<typeof Component>` now that `__contract`
 * exists anyway (Phase 3 retention, needed regardless of this decision) and to match what this
 * adapter's own README already documented — closing that doc/implementation mismatch rather than
 * leaving it as a documentation-only fix.
 */
export type ContractProps<T extends HasContract<FactoryOptions>> =
  T extends HasContract<infer C extends FactoryOptions>
    ? ContractGenericsOf<C> extends infer G extends PolymorphicGenerics
      ? PolymorphicProps<G> | PolymorphicWithAsChild<G>
      : never
    : never
