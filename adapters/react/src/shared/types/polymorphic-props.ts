import type { NonEmptyTuple, Simplify } from 'type-fest'
import type { JSX, ReactElement, ReactNode, Ref } from 'react'
import type {
  AllowedOf,
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
import type { RenderCallbackProps } from './props'
import type { UnknownProps } from './primitives'

/**
 * Resolves the instance type exposed through `ref` for a polymorphic
 * element.
 *
 * Intrinsic HTML elements map to their corresponding DOM element type;
 * custom React components currently resolve to `unknown`.
 */
export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

/**
 * React's intrinsic JSX props for an element type.
 *
 * Custom components intentionally resolve to `UnknownProps`; their own
 * prop definitions determine the accepted props.
 */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

/**
 * Removes index signatures while preserving explicitly declared
 * properties.
 *
 * Prevents broad index signatures (for example `Record<string, unknown>`)
 * from causing `keyof T` to become `string`, which would otherwise erase
 * every intrinsic prop during `Omit`.
 */
type StripIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

/** Props explicitly declared by the component. */
type ComponentProps<G extends PolymorphicGenerics> = StripIndexSignature<PropsOf<G>>

/** Variant props generated from the component's variant definitions. */
type ComponentVariants<G extends PolymorphicGenerics> = StripIndexSignature<
  VariantProps<VariantsOf<G>>
>

/**
 * Props defined by the component itself.
 *
 * These override intrinsic JSX props with the same name.
 */
type OwnedProps<G extends PolymorphicGenerics> = ComponentProps<G> & ComponentVariants<G>

/**
 * Props that control how the component renders.
 *
 * `children` and `asChild` are intentionally omitted so each render
 * strategy can define its own contract.
 */
type PolymorphicControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = {
  /**
   * Restrict `as` to `allowedAs` when configured.
   *
   * Without `allowedAs`, `AllowedOf<G>` resolves to `ElementType`,
   * so the intersection becomes `TAs`.
   */
  as?: TAs & AllowedOf<G>

  /**
   * Explicit `undefined` keeps wrapper components compatible with
   * `exactOptionalPropertyTypes`.
   */
  className?: ClassName | undefined

  recipe?: keyof RecipeOf<G>

  /** Ref type follows the resolved element. */
  ref?: Ref<ElementRef<TAs>>
}

/**
 * All props reserved by the polymorphic component.
 *
 * Used primarily to exclude conflicting intrinsic JSX props.
 */
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OwnedProps<G> &
  PolymorphicControlProps<G, TAs>

/**
 * Intrinsic JSX props after removing every reserved component prop.
 *
 * Component-defined props always take precedence.
 */
type IntrinsicPropsWithoutOwned<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
>

/**
 * `data-*` attribute passthrough.
 *
 * React's `JSX.IntrinsicElements[tag]` prop types carry no `data-*` index — the JSX checker
 * special-cases `data-*` at the call site instead — so `IntrinsicPropsWithoutOwned` (which is
 * `Omit<JSX.IntrinsicElements[tag], …>`) has no `data-*` key either. A polymorphic component
 * always renders to a host element (or forwards to one via `asChild`) and its runtime prop
 * pipeline forwards `data-*` unchanged, so the extracted prop type must admit them: without this,
 * a wrapper can't destructure a `data-*` the contract sets in `defaults` (`data-slot` is the
 * common case — a styling hook every design system sets and overrides) — `ContractProps<typeof
 * Component>['data-slot']` would be a type error even though `<Component data-slot="…" />` is
 * accepted.
 *
 * The value type is `string | number | boolean | undefined` by deliberate choice — exactly what
 * React serializes onto a `data-*` attribute (`true`/`false` render as the strings `"true"` /
 * `"false"`, not omitted; `undefined` omits) and what survives praxis-kit's prop pipeline
 * unchanged. It is intentionally tighter than the framework-neutral `unknown` the core contract
 * uses, so a wrapper can destructure a `data-*` and forward it without a cast — the whole point.
 */
type DataAttribute = `data-${string}`

type DataAttributes = {
  [key: DataAttribute]: string | number | boolean | undefined
}

/**
 * Props shared by every rendering strategy.
 *
 * Each render mode contributes only its discriminating props.
 */
type BaseProps<G extends PolymorphicGenerics, TAs extends ElementType> = IntrinsicPropsWithoutOwned<
  G,
  TAs
> &
  ControlProps<G, TAs> &
  DataAttributes

/** Standard rendering (`asChild` absent or false). */
type NormalRenderMode = {
  asChild?: false
  children?: ReactNode | undefined
}

/**
 * Slot rendering.
 *
 * Requires one or more React elements and forbids `as`, since the child
 * determines the rendered element.
 */
type SlotRenderMode = {
  asChild: true
  as?: never
  children: ReactElement | NonEmptyTuple<ReactElement>
}

/**
 * Render callback mode.
 *
 * Receives the fully resolved props and returns the rendered element.
 */
type CallbackRenderMode = {
  render: (props: RenderCallbackProps) => ReactElement
  asChild?: never
  children?: never
}

/**
 * Standard polymorphic props.
 *
 * HTML attributes are inferred from `as`.
 */
export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<BaseProps<G, TAs> & NormalRenderMode>

/**
 * Slot rendering props.
 *
 * Requires one or more ReactElement children.
 */
export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<BaseProps<G, TAs> & SlotRenderMode>

/**
 * Render callback props.
 */
export type PolymorphicWithRender<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<BaseProps<G, TAs> & CallbackRenderMode>

/**
 * The layout keys a prop-union actually carries as the tailwind plugin's mutually-exclusive
 * shape: distributed over every member of `P`, a key counts when its value there is exactly
 * `true` (the active member) or `never` (a suppressed one) — the two shapes `ExclusiveTrueProp`
 * produces. `[M[K]] extends [true]` matches both and rejects `boolean`, so a component's *own*
 * same-named prop and the intrinsic `hidden` attribute (both `boolean`) are not counted, and a
 * component with no `styling.plugin` yields `never`.
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
 * an optional `true` — for the **type-extraction** path (`ContractProps<T>`) only.
 *
 * `styling.plugin: createTailwindPipeline` contributes `ExclusiveTrueProp<LayoutKey>` — a ~22-way
 * union (`{ flex: true } | { grid: true } | …`) that distributes through every downstream type,
 * so `PolymorphicProps<G>` (and a `ContractProps<T>` built from it) becomes a ~22-member union
 * whose members share no common layout key. That makes the extracted type hostile to every
 * structural operation a consumer does with it: a spread matches no member on any extra/missing
 * key (`not assignable to '… | … 20 more … | …'`), `Omit`/`Pick`/`Merge` trips `TS2590 union too
 * complex`, a rest-destructure trips `TS2700`.
 *
 * A consumer extracting props to build a wrapper wants "the layout props exist and are optional",
 * not the discriminated union — so flatten it here. The strict union stays on
 * `PolymorphicComponent<G>`'s call overloads, where "only one display prop may be `true`" is the
 * whole point of the compile error. See finding #44 /
 * `praxis-kit-0.1.x-contractprops-regression.md` item #2.
 *
 * `Omit<P, LayoutKeyName>` (a static key set, so cheap) drops every layout key from every member
 * — the members only ever differed there — so the union dedupes to one; the flat
 * `{ flex?: true; … }` is added back from just the keys the union really had. The
 * `LayoutPluginKeys<P> extends never` fast-path returns `P` untouched for a plugin-less
 * component, so the expensive `Omit` never runs on the (large) intrinsic-prop object there.
 */
type FlattenLayout<P> = [P] extends [never]
  ? never
  : [LayoutPluginKeys<P>] extends [never]
    ? P
    : Simplify<Omit<P, LayoutKeyName> & { [K in LayoutPluginKeys<P>]?: true }>

/**
 * A polymorphic React component.
 *
 * Overloads provide three rendering strategies:
 *
 * - `render`   — render callback
 * - `asChild`  — slot rendering
 * - default    — standard polymorphic rendering
 */
export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithRender<G, TAs>): ReactElement

  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): ReactElement

  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): ReactElement

  /**
   * Non-generic fallback overload used for type extraction.
   *
   * TypeScript resolves conditional types such as
   * `React.ComponentProps<typeof Component>` against only the final
   * overload. Anchoring that overload to the default element preserves
   * correct prop inference for tools such as Storybook and
   * `React.ComponentProps`.
   *
   * Deliberately *not* run through `FlattenLayout`: this overload is still a
   * real call signature (it catches calls the three generic overloads reject),
   * so flattening it here would make `<Component flex grid />` — two
   * mutually-exclusive layout props — compile. `ContractProps<T>` does the
   * flattening instead, on the pure type-extraction path. `React.ComponentProps`
   * keeps the strict union it already had.
   */
  (props: PolymorphicProps<G, DefaultOf<G>>): ReactElement

  /**
   * Type-only; never assigned at runtime. See `HasGenerics<G>` (`@praxis-kit/contract-props`) for
   * the full rationale — kept as an inline field rather than `HasGenerics<G> & {...}` because
   * intersecting it onto this callable type changes how `PolymorphicComponent<any>` (used by
   * test helpers like `box()`) resolves against concrete instantiations; structurally identical
   * to `HasGenerics<G>` either way, which is what lets `ContractProps` constrain against it.
   */
  readonly __generics?: G

  displayName?: string
}

/**
 * Recovers a built `PolymorphicComponent<G>`'s prop shape for a specific render mode, from
 * outside the file that built it — the missing piece `React.ComponentProps<typeof Component>`
 * can't provide, since it always resolves against `PolymorphicComponent`'s normal-mode fallback
 * overload (see that type's own doc comment).
 *
 * ```tsx
 * const Container = createContractComponent({ tag: 'div', name: 'Container', /* ... *\/ })
 *
 * // Normal-mode props (equivalent to ComponentProps<typeof Container>, but works for every mode):
 * type ContainerProps = ContractProps<typeof Container>
 *
 * // A wrapper that always renders Container with asChild — ComponentProps<typeof Container>
 * // fails here ("Type 'true' is not assignable to type 'false'"); ContractProps doesn't.
 * type ContainerAsChildProps = ContractProps<typeof Container, 'asChild'>
 * ```
 *
 * `T` accepts any built component value (`PolymorphicComponent<G>` or `CompoundComponent<G, S>` —
 * the latter's sub-component intersection doesn't disturb `__generics`, which lives on the root
 * call signature) via its own `__generics` marker; the `never` branch below only fires for a
 * non-praxis-kit component, which has no `__generics` field to infer from at all.
 *
 * Always resolves against the component's *default* element (`PolymorphicWithAsChild<G,
 * DefaultOf<G>>`, etc.) — the same ceiling `React.ComponentProps<typeof Component>` already has
 * for its one mode, not a new limitation `ContractProps` introduces. `ContractProps<typeof
 * Button>` is "`Button`'s contract for its default element," not a substitute for
 * `PolymorphicProps<G, 'a'>` when a caller needs a specific non-default `as` — those remain two
 * different questions with two different answers.
 */
export type ContractProps<T extends HasGenerics<PolymorphicGenerics>, M extends Mode = 'normal'> =
  T extends HasGenerics<infer G extends PolymorphicGenerics>
    ? PickMode<
        M,
        FlattenLayout<PolymorphicProps<G, DefaultOf<G>>>,
        FlattenLayout<PolymorphicWithAsChild<G, DefaultOf<G>>>,
        FlattenLayout<PolymorphicWithRender<G, DefaultOf<G>>>
      >
    : never

/**
 * A `PolymorphicComponent<G>` with named sub-components attached, e.g.
 * `Card.Header`/`Card.Content`/`Card.Footer`.
 *
 * Intersecting named properties onto `PolymorphicComponent<G>` doesn't
 * disturb its call signatures, so `React.ComponentProps<typeof Card>`
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
