import type { JSX } from 'solid-js'
import type { OmitIndexSignature, Simplify } from 'type-fest'
import type {
  ClassName,
  ContractGenericsOf,
  DefaultOf,
  ElementType,
  FactoryOptions,
  IntrinsicTag,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { HasContract } from '@praxis-kit/contract-props'
import type { SolidElement, UnknownProps } from './primitives'

export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OmitIndexSignature<
  PropsOf<G>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: TAs
    class?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: (el: ElementRef<TAs>) => void
  }

type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children' | 'ref'
> &
  ControlProps<G, TAs>

/**
 * Props an `asChild` render function receives once defaults, variant classes, and ARIA role
 * resolution have all run (see `buildSlotProps` in `render.tsx`). `class` is narrowed to a
 * resolved `string`, not the wider `ClassName` a caller may pass in. `ref` is typed for spreading
 * straight onto a concrete element, unlike `AsChildProps.ref`'s bare `unknown`. `role` is
 * intentionally left off the type entirely — a render function that needs it casts locally.
 *
 * The `ref`/`role` reasoning (contravariance, why every representation of `role` fails to spread
 * onto Solid's per-element JSX types) is real design intent, not obvious from the type alone — see
 * `DECISIONS.md` → "`adapters/solid` — `ResolvedSlotProps`'s `ref`/`role` typing" for the full case.
 */
export type ResolvedSlotProps<G extends PolymorphicGenerics> = Partial<
  OmitIndexSignature<PropsOf<G>>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    class?: string | undefined
    ref?: (el: Element) => void
  }

/** An `asChild` render function, receiving the fully-resolved `ResolvedSlotProps<G>`. */
export type SlotRenderFn<G extends PolymorphicGenerics> = (
  props: ResolvedSlotProps<G>,
) => SolidElement

// When asChild is true, intrinsic DOM props (type, href, …) are not required — the
// render function owns the element and its required attributes. PropsOf<G> (component
// defaults) is made Partial because those values are filled by the runtime; callers
// should not be forced to re-supply them. ref is typed loosely because the actual
// element type depends on what the render function produces.
type AsChildProps<G extends PolymorphicGenerics> = Partial<OmitIndexSignature<PropsOf<G>>> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: never
    asChild: true
    children: SlotRenderFn<G>
    class?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: unknown
  }

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<(SharedProps<G, TAs> & { asChild?: false; children?: unknown }) | AsChildProps<G>>

export type PolymorphicComponent<
  G extends PolymorphicGenerics,
  C extends FactoryOptions = FactoryOptions,
> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): JSX.Element

  /**
   * Non-generic fallback overload used for type extraction.
   *
   * TypeScript resolves conditional types such as
   * `ComponentProps<typeof Component>` against only the final overload.
   * Anchoring that overload to the default element preserves correct prop
   * inference for tools such as Storybook and `ComponentProps`.
   */
  (props: PolymorphicProps<G, DefaultOf<G>>): JSX.Element

  /**
   * Type-only; never assigned at runtime — same rationale as React's/Preact's `__contract` (see
   * `HasContract<C>`, `@praxis-kit/contract-props`). Carries the *complete* contract this
   * component was built from (`C`, the argument `createContractComponent<C extends
   * SolidFactoryOptions>` was actually called with). Unlike React's/Preact's `__generics` (which
   * this adapter never needed — `PolymorphicProps<G, TAs>` already folds both render modes into
   * one type, with no overload-resolution ceiling forcing a marker for `G` the way those two
   * adapters need), `C` still needs one: nothing else on this type exposes the *complete*
   * contract, only its `PolymorphicGenerics` projection. Defaults to the widest `FactoryOptions`
   * so every existing one-argument `PolymorphicComponent<G>` reference keeps resolving exactly as
   * before.
   */
  readonly __contract?: C

  displayName?: string
}

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>`'s call
 * signature doesn't disturb it — `Card.Header` and friends are ordinary
 * object properties, not part of the call signature.
 */
export type CompoundComponent<
  G extends PolymorphicGenerics,
  S extends Readonly<StringMap<PolymorphicGenerics>>,
> = PolymorphicComponent<G> & {
  readonly [K in keyof S]: PolymorphicComponent<S[K]>
}

/**
 * A component's full prop contract — `PolymorphicProps<G, TAs>` already folds both render modes
 * into one unioned type (rather than two separate types the way React/Preact split them), and
 * `PolymorphicComponent<G>`'s fallback overload already returns that whole union, so this is that
 * same shape, projected from the component's retained `__contract` rather than a bare `G` the
 * caller must already have in hand — `ContractProps<typeof Box>`, matching every other adapter,
 * not `ContractProps<SomeG>`.
 *
 * An earlier version of this type took `G` directly (`ContractProps<G extends
 * PolymorphicGenerics>`) — a genuinely different public shape, not a bug fix here: Solid's
 * `PolymorphicProps<G, TAs>` never had React's/Preact's overload-resolution ceiling, so there was
 * no *forced* reason for a marker. Unified to `ContractProps<typeof Component>` now that
 * `__contract` exists anyway (Phase 3 retention, needed regardless of this decision), mirroring
 * Vue's identical Phase 4 decision for the identical reason.
 */
export type ContractProps<T extends HasContract<FactoryOptions>> =
  T extends HasContract<infer C extends FactoryOptions>
    ? ContractGenericsOf<C> extends infer G extends PolymorphicGenerics
      ? PolymorphicProps<G>
      : never
    : never
