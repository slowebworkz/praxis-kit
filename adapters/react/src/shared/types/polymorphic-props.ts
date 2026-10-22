import type { NonEmptyTuple, OmitIndexSignature, Simplify } from 'type-fest'
import type { JSX, ReactElement, ReactNode, Ref } from 'react'
import type {
  AllowedOf,
  ClassName,
  DefaultOf,
  ElementType,
  FactoryOptions,
  FlattenPluginProps,
  ContractPluginOf,
  IntrinsicTag,
  PolymorphicGenerics,
  RecipeOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { StringMap } from '@praxis-kit/primitive'
import type { HasContract, Mode, PickMode } from '@praxis-kit/contract-props'
import type { ContractGenericsWithComposeOf } from '@praxis-kit/compose-props'
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

/** Props explicitly declared by the component.
 *
 * `OmitIndexSignature` (type-fest) — not a hand-rolled version — matches every other adapter's
 * own `polymorphic-props.ts` (Preact/Vue/Solid all import the same utility for this exact
 * purpose): strips a broad index signature (e.g. `Record<string, unknown>`) so `keyof T` doesn't
 * become `string`, which would otherwise erase every intrinsic prop during the `Omit` below. */
type ComponentProps<G extends PolymorphicGenerics> = OmitIndexSignature<PropsOf<G>>

/** Variant props generated from the component's variant definitions. */
type ComponentVariants<G extends PolymorphicGenerics> = OmitIndexSignature<
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
 * Standard polymorphic props with `as` widened to every tag the component allows, not just its
 * default — the type-level equivalent of what real JSX usage (`<Box as="nav">`) already gets
 * through `createContractComponent`'s call signature. `PolymorphicProps<G>` (one type argument)
 * can't do this: `TAs` defaults to `DefaultOf<G>`, a single tag, so a `<Name>Props` alias built
 * from it only accepts that one default tag. Opt in here instead of hand-deriving `AllowedOf<G>`
 * at each call site.
 */
export type PolymorphicWithAllowedAs<G extends PolymorphicGenerics> = PolymorphicProps<
  G,
  AllowedOf<G>
>

/**
 * A polymorphic React component.
 *
 * Overloads provide three rendering strategies:
 *
 * - `render`   — render callback
 * - `asChild`  — slot rendering
 * - default    — standard polymorphic rendering
 */
export type PolymorphicComponent<
  G extends PolymorphicGenerics,
  C extends FactoryOptions = FactoryOptions,
> = {
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
   * Deliberately *not* run through `FlattenPluginProps`: this overload is still a
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
   * to `HasGenerics<G>` either way.
   *
   * `ContractProps` no longer reads this field directly (Phase 4: it projects `G` from the
   * retained `__contract` below instead) — kept per Phase 3's migration policy (added alongside
   * `__contract`, not replaced by it, until every adapter and test proves the new relationship
   * out), and because other code may still constrain against `HasGenerics<G>` directly.
   */
  readonly __generics?: G

  /**
   * Type-only; never assigned at runtime — same rationale as `__generics` above, and the same
   * "inline field, not intersected" reason (see `HasContract<C>`, `@praxis-kit/contract-props`).
   * Carries the *complete* contract this component was built from (`C`, the argument
   * `createContractComponent<C extends ReactFactoryOptions>` was actually called with) —
   * deliberately a second, separate marker from `__generics`, not `__generics` broadened to do
   * both jobs: `G` answers "what does the adapter need to implement this component," `C` answers
   * "what was this component configured with" — related questions, different answers (see
   * `DECISIONS.md`'s `defineContract` entry). Defaults to the widest `FactoryOptions` so every
   * existing two-argument `PolymorphicComponent<G>` reference keeps resolving exactly as before.
   */
  readonly __contract?: C

  displayName?: string
}

/**
 * Recovers a built `PolymorphicComponent<G, C>`'s prop shape for a specific render mode, from
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
 * Projects off the component's retained `__contract` (`C`, via `HasContract<C>` —
 * `@praxis-kit/contract-props`), not `__generics` (`G`) — a deliberate Phase 4 rewire, not a new
 * mechanism: `G` is *derived* from `C` via `ContractGenericsWithComposeOf<C>`
 * (`@praxis-kit/compose-props`) — `C`'s own contract-derived `G` with its `compose.with` partner's
 * props/variants folded in when `allProps: true`, falling back to the same
 * `ContractGenericsWithAllowedOf<C>` projection `createContractComponent`'s own return type uses
 * (`__generics`) when there's nothing to compose. **This means `ContractProps<T>` and `__generics`
 * genuinely diverge for a composing component** — `ContractProps<typeof Card>` sees `Surface`'s
 * forwarded props, `Card`'s own `__generics` (and therefore `React.ComponentProps<typeof Card>`)
 * does not, by design (see `docs/design/compose-props-typing.md` — the composed surface is
 * deliberately a type-extraction-time concern, not a change to the component's own callable
 * signature). For every non-composing component the two still agree exactly, same as before this
 * wiring landed. `FlattenPluginProps`, `PickMode`, `Mode`, and the three `Polymorphic*` prop-shape types
 * below are unchanged — only where `G` comes from moved. `__generics` itself is untouched (Phase
 * 3's migration policy: added alongside `__contract`, not replaced by it, until every adapter and
 * test proves the new relationship out — see that field's own doc comment).
 *
 * `T` accepts any built component value (`PolymorphicComponent<G, C>` or `CompoundComponent<G, S>`
 * — the latter's sub-component intersection doesn't disturb `__contract`, which lives on the root
 * call signature) via its own `__contract` marker; the `never` branch below only fires for a
 * non-praxis-kit component, which has no `__contract` field to infer from at all.
 *
 * Always resolves against the component's *default* element (`PolymorphicWithAsChild<G,
 * DefaultOf<G>>`, etc.) — the same ceiling `React.ComponentProps<typeof Component>` already has
 * for its one mode, not a new limitation `ContractProps` introduces. `ContractProps<typeof
 * Button>` is "`Button`'s contract for its default element," not a substitute for
 * `PolymorphicProps<G, 'a'>` when a caller needs a specific non-default `as` — those remain two
 * different questions with two different answers.
 */
export type ContractProps<T extends HasContract<FactoryOptions>, M extends Mode = 'normal'> =
  T extends HasContract<infer C extends FactoryOptions>
    ? ContractGenericsWithComposeOf<C> extends infer G extends PolymorphicGenerics
      ? PickMode<
          M,
          FlattenPluginProps<
            PolymorphicProps<G, DefaultOf<G>>,
            ContractPluginOf<C>
          >,
          FlattenPluginProps<
            PolymorphicWithAsChild<G, DefaultOf<G>>,
            ContractPluginOf<C>
          >,
          FlattenPluginProps<
            PolymorphicWithRender<G, DefaultOf<G>>,
            ContractPluginOf<C>
          >
        >
      : never
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
