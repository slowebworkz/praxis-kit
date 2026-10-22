import type { JSX, Ref } from 'preact'
import type { AnyVNode, UnknownProps } from './primitives'
import type { OmitIndexSignature, Simplify } from 'type-fest'
import type {
  AllowedOf,
  ClassName,
  DefaultOf,
  ElementType,
  FactoryOptions,
  FlattenPluginProps,
  IntrinsicTag,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { HasContract, Mode, PickMode } from '@praxis-kit/contract-props'
import type { ComposedPluginOf, ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'

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
    className?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: Ref<ElementRef<TAs>>
  }

type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
> &
  ControlProps<G, TAs>

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & { asChild?: false; children?: unknown }>

export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  SharedProps<G, TAs> & {
    asChild: true
    as?: never
    children: AnyVNode | AnyVNode[]
  }
>

/**
 * Standard polymorphic props with `as` widened to every tag the component allows, not just its
 * default — the type-level equivalent of what real JSX usage already gets through
 * `createContractComponent`'s call signature. `PolymorphicProps<G>` (one type argument) can't do
 * this: `TAs` defaults to `DefaultOf<G>`, a single tag, so a `<Name>Props` alias built from it only
 * accepts that one default tag. Opt in here instead of hand-deriving `AllowedOf<G>` at each call
 * site.
 */
export type PolymorphicWithAllowedAs<G extends PolymorphicGenerics> = PolymorphicProps<
  G,
  AllowedOf<G>
>

export type PolymorphicComponent<
  G extends PolymorphicGenerics,
  C extends FactoryOptions = FactoryOptions,
> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): AnyVNode
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): AnyVNode

  /**
   * Non-generic fallback overload used for type extraction.
   *
   * TypeScript resolves conditional types such as
   * `ComponentProps<typeof Component>` against only the final overload.
   * Anchoring that overload to the default element preserves correct prop
   * inference for tools such as Storybook and `ComponentProps`.
   */
  (props: PolymorphicProps<G, DefaultOf<G>>): AnyVNode

  /**
   * Type-only; never assigned at runtime. See `HasGenerics<G>` (`@praxis-kit/contract-props`) for
   * the full rationale — kept as an inline field rather than `HasGenerics<G> & {...}` because
   * intersecting it onto this callable type changes how `PolymorphicComponent<any>` resolves
   * against concrete instantiations (confirmed for React's identical shape,
   * `adapters/react/src/shared/types/polymorphic-props.test.ts`); structurally identical to
   * `HasGenerics<G>` either way.
   *
   * `ContractProps` no longer reads this field directly (it projects `G` from the retained
   * `__contract` below instead, mirroring React's identical Phase 4 rewire) — kept per the same
   * migration policy: added alongside `__contract`, not replaced by it, until every adapter and
   * test proves the new relationship out, and because other code may still constrain against
   * `HasGenerics<G>` directly.
   */
  readonly __generics?: G

  /**
   * Type-only; never assigned at runtime — same rationale as `__generics` above. Carries the
   * *complete* contract this component was built from (`C`, the argument
   * `createContractComponent<C extends PreactFactoryOptions>` was actually called with) —
   * deliberately a second, separate marker from `__generics`, not `__generics` broadened to do
   * both jobs: `G` answers "what does the adapter need to implement this component," `C` answers
   * "what was this component configured with." Defaults to the widest `FactoryOptions` so every
   * existing two-argument `PolymorphicComponent<G>` reference keeps resolving exactly as before.
   */
  readonly __contract?: C

  displayName?: string
}

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>` doesn't
 * disturb its call signatures, so `ComponentProps<typeof Card>`-style
 * extraction keeps resolving the root's own props exactly as it does for a
 * plain `PolymorphicComponent<G>` — `Card.Header` and friends are ordinary
 * object properties, not additional call signatures.
 */
export type CompoundComponent<
  G extends PolymorphicGenerics,
  S extends Readonly<StringMap<PolymorphicGenerics>>,
> = PolymorphicComponent<G> & {
  readonly [K in keyof S]: PolymorphicComponent<S[K]>
}

/**
 * Recovers a built `PolymorphicComponent<G>`'s prop shape for a specific render mode, from
 * outside the file that built it — the missing piece `ComponentProps<typeof Component>` can't
 * provide, since it always resolves against `PolymorphicComponent`'s normal-mode fallback
 * overload (see that type's own doc comment).
 *
 * No `'render'` mode — Preact has no render-callback render strategy, unlike React.
 *
 * Projects `G` via `ContractGenericsWithComposeOf<C>` (`@praxis-kit/compose-props`), not the
 * plainer `ContractGenericsOf<C>` — folds a `compose.with` partner's props/variants in when
 * `allProps: true`, falling back to the same projection `createContractComponent`'s own return
 * type uses when there's nothing to compose. Mirrors React's identical wiring; see
 * `docs/design/compose-props-typing.md`.
 *
 * ```tsx
 * const Container = createContractComponent({ tag: 'div', name: 'Container', /* ... *\/ })
 *
 * // Normal-mode props (equivalent to ComponentProps<typeof Container>, but works for asChild too):
 * type ContainerProps = ContractProps<typeof Container>
 *
 * // A wrapper that always renders Container with asChild — ComponentProps<typeof Container>
 * // fails here ("Type 'true' is not assignable to type 'false'"); ContractProps doesn't.
 * type ContainerAsChildProps = ContractProps<typeof Container, 'asChild'>
 * ```
 */
export type ContractProps<
  T extends HasContract<FactoryOptions>,
  M extends Exclude<Mode, 'render'> = 'normal',
> =
  T extends HasContract<infer C extends FactoryOptions>
    ? ContractGenericsWithComposeOf<C> extends infer G extends PolymorphicGenerics
      ? PickMode<
          M,
          FlattenPluginProps<PolymorphicProps<G, DefaultOf<G>>, ComposedPluginOf<C>>,
          FlattenPluginProps<PolymorphicWithAsChild<G, DefaultOf<G>>, ComposedPluginOf<C>>,
          never
        >
      : never
    : never
