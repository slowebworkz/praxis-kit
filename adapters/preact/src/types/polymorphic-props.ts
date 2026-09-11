import type { JSX, Ref } from 'preact'
import type { AnyVNode, UnknownProps } from './primitives'
import type { OmitIndexSignature, Simplify } from 'type-fest'
import type {
  ClassName,
  DefaultOf,
  ElementType,
  IntrinsicTag,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { LayoutKeyName } from '@praxis-kit/tailwind'
import type { HasGenerics, Mode, PickMode } from '@praxis-kit/contract-props'

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
 * The layout keys a prop-union actually carries as the tailwind plugin's mutually-exclusive
 * shape: distributed over every member of `P`, a key counts when its value there is exactly
 * `true` or `never` — the two shapes `ExclusiveTrueProp` produces. `[M[K]] extends [true]`
 * matches both and rejects `boolean`, so a component's own same-named prop and the intrinsic
 * `hidden` attribute are not counted, and a plugin-less component yields `never`.
 */
type LayoutPluginKeys<P> = {
  [K in LayoutKeyName]-?: P extends infer M
    ? K extends keyof M
      ? [M[K]] extends [true]
        ? K
        : never
      : never
    : never
}[LayoutKeyName]

/**
 * Collapses the mutually-exclusive `LayoutProps` union down to one flat shape — every layout key
 * an optional `true` — for the **type-extraction** path (`ContractProps<T>`) only. Mirrors the
 * React adapter's `FlattenLayout` (`adapters/react/src/shared/types/polymorphic-props.ts`), where
 * the full rationale lives.
 *
 * `styling.plugin: createTailwindPipeline` contributes `ExclusiveTrueProp<LayoutKey>` — a ~22-way
 * union (`{ flex: true } | { grid: true } | …`) that distributes through `PropsOf<G>` and
 * everything built from it, so a `ContractProps<T>` built from it becomes a ~22-member union
 * whose members share no common layout key: hostile to a spread (matches no member), to
 * `Omit`/`Pick`/`Merge` (`TS2590 union too complex`) and to a rest-destructure (`TS2700`). A
 * consumer extracting props for a wrapper wants "the layout props exist and are optional", not
 * the discriminated union. The strict union stays on `PolymorphicComponent<G>`'s call overloads.
 * See finding #44 / `praxis-kit-0.1.x-contractprops-regression.md` item #2.
 *
 * `Omit<P, LayoutKeyName>` (a static key set) drops every layout key from every member so the
 * union dedupes to one; the flat `{ flex?: true; … }` is added back from just the keys the union
 * really had. The `LayoutPluginKeys<P> extends never` fast-path returns `P` untouched for a
 * plugin-less component, so the `Omit` never runs on its large intrinsic-prop object.
 */
type FlattenLayout<P> = [P] extends [never]
  ? never
  : [LayoutPluginKeys<P>] extends [never]
    ? P
    : Simplify<Omit<P, LayoutKeyName> & { [K in LayoutPluginKeys<P>]?: true }>

export type PolymorphicComponent<G extends PolymorphicGenerics> = {
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
   * Type-only; never assigned at runtime. See `HasGenerics<G>` for
   * the full rationale — kept as an inline field rather than `HasGenerics<G> & {...}` because
   * intersecting it onto this callable type changes how `PolymorphicComponent<any>` resolves
   * against concrete instantiations (confirmed for React's identical shape,
   * `adapters/react/src/shared/types/polymorphic-props.test.ts`); structurally identical to
   * `HasGenerics<G>` either way, which is what lets `ContractProps` constrain against it.
   */
  readonly __generics?: G

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
  T extends HasGenerics<PolymorphicGenerics>,
  M extends Exclude<Mode, 'render'> = 'normal',
> =
  T extends HasGenerics<infer G extends PolymorphicGenerics>
    ? PickMode<
        M,
        FlattenLayout<PolymorphicProps<G, DefaultOf<G>>>,
        FlattenLayout<PolymorphicWithAsChild<G, DefaultOf<G>>>,
        never
      >
    : never
