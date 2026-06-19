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
import type { RenderCallbackProps } from './props'
import type { UnknownProps } from './primitives'

/** Maps a core ElementType to its DOM instance type for ref inference. */
export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

/** @internal React JSX intrinsic props for a given element type. */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

/**
 * @internal
 * Removes index signatures (e.g. `[key: string]: T`) from a type, keeping only
 * explicitly named properties. Used to prevent fallback-to-constraint generics
 * like `Record<string, unknown>` or `Readonly<VariantMap>` from producing a
 * `[key: string]: T` member that makes `keyof` resolve to `string` — which
 * would cause `Omit<IntrinsicJSXProps<TAs>, string>` to remove all HTML props.
 */
type StripIndexSignature<T> = {
  [K in keyof T as string extends K ? never : K]: T[K]
}

type ComponentProps<G extends PolymorphicGenerics> = StripIndexSignature<PropsOf<G>>
type ComponentVariants<G extends PolymorphicGenerics> = StripIndexSignature<
  VariantProps<VariantsOf<G>>
>
type OwnedProps<G extends PolymorphicGenerics> = ComponentProps<G> & ComponentVariants<G>

/**
 * @internal
 * Polymorphic machinery props. Separated from `OwnedProps` so the two concerns
 * are distinct: user-defined props vs. the tag/ref/class system.
 *
 * `asChild` and `children` are excluded — typed separately in the discriminated
 * union below so each render mode can enforce different child constraints.
 */
type PolymorphicControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = {
  // TAs & AllowedOf<G>: when allowedAs is set, restricts the as prop to the allowed union.
  // When no allowedAs, AllowedOf<G> = ElementType and TAs & ElementType = TAs (no change).
  as?: TAs & AllowedOf<G>
  // Accept explicit `undefined` so exactOptionalPropertyTypes doesn't flag spreads
  // from wrapper components whose optional props arrive as `T | undefined` via Omit.
  className?: ClassName | undefined
  recipe?: keyof RecipeOf<G>
  ref?: Ref<ElementRef<TAs>>
}

/** @internal Full set of props owned by the component — used as the Omit key in IntrinsicPropsWithoutOwned. */
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OwnedProps<G> &
  PolymorphicControlProps<G, TAs>

type IntrinsicPropsWithoutOwned<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
>

// children is excluded here so each render-mode discriminant can enforce its own child constraint.
type SharedProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType,
> = IntrinsicPropsWithoutOwned<G, TAs> & ControlProps<G, TAs>

/** Discriminant for the normal render path: `asChild` absent or false, any children. */
type NormalRenderMode = {
  asChild?: false
  children?: ReactNode | undefined
}

/**
 * Discriminant for the slot render path. One or more `ReactElement` children required.
 * `as` is forbidden — combining `as` with `asChild` is a runtime invariant violation.
 */
type SlotRenderMode = {
  asChild: true
  as?: never
  children: ReactElement | NonEmptyTuple<ReactElement>
}

/**
 * Discriminant for the render-prop path. The callback receives all resolved props
 * (className, ref, filtered component props) and returns the target element.
 *
 * This is the output form for the compile-time `asChild` transform: keeps the same
 * rendering flexibility as `asChild` without the `cloneElement` cost at runtime.
 * Unlike `asChild`, the render callback does not auto-merge conflicting event
 * handlers — spread position determines precedence.
 *
 * ```tsx
 * <Button render={(p) => <a href="/home" {...p} />} size="lg" />
 * ```
 */
type CallbackRenderMode = {
  render: (props: RenderCallbackProps) => ReactElement
  asChild?: never
  children?: never
}

/**
 * Props for the normal render path. HTML attributes are inferred from `TAs`.
 *
 * `Omit + intersection` (not `Merge`) is used so TypeScript can infer `TAs` from
 * the `as` prop value; control props win on key conflicts.
 */
export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & NormalRenderMode>

/**
 * Props for the slot render path (`asChild: true`). One or more `ReactElement`
 * children are required. Multiple children are permitted for the Slottable
 * sibling pattern where one child is a `<Slottable>` wrapper.
 */
export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & SlotRenderMode>

export type PolymorphicWithRender<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & CallbackRenderMode>

/**
 * A polymorphic component that infers HTML attributes and ref type from the `as` prop.
 *
 * Three call signatures form a discriminated union:
 * - `render` present       → render-prop path; no Slot or cloneElement at runtime
 * - `asChild: true`        → slot path; exactly one `ReactElement` child required
 * - `asChild?: false`      → normal path; any `ReactNode` children accepted
 */
export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithRender<G, TAs>): ReactElement
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): ReactElement
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): ReactElement
  displayName?: string
}
