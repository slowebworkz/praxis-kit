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

/**
 * Maps a polymorphic element type to the instance type exposed through `ref`.
 *
 * Intrinsic HTML elements resolve to their corresponding DOM element type;
 * custom React components currently fall back to `unknown`.
 */
export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

/**
 * React's intrinsic JSX props for a given element.
 *
 * Custom components intentionally fall back to `UnknownProps`; the component's
 * own prop model defines their accepted props instead.
 */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

/**
 * Removes index signatures while preserving explicitly named properties.
 *
 * This prevents generic fallback constraints such as `Record<string, unknown>`
 * from collapsing `keyof T` to `string`, which would cause
 * `Omit<IntrinsicJSXProps<T>, keyof ...>` to remove every intrinsic prop.
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
 * Props owned by the component itself.
 *
 * These take precedence over intrinsic HTML props when names overlap.
 */
type OwnedProps<G extends PolymorphicGenerics> = ComponentProps<G> & ComponentVariants<G>

/**
 * Polymorphic rendering controls.
 *
 * These describe *how* the component renders rather than the data it owns.
 *
 * `children` and `asChild` are intentionally omitted so each render mode
 * can provide its own stricter contract.
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
 * Complete set of props owned by the component.
 *
 * Used primarily as the exclusion list when inheriting intrinsic JSX props.
 */
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OwnedProps<G> &
  PolymorphicControlProps<G, TAs>

/**
 * Intrinsic JSX props after removing every prop owned by the component.
 *
 * Component props always win over intrinsic props with the same name.
 */
type IntrinsicPropsWithoutOwned<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
>

/**
 * Base props shared by every render mode.
 *
 * Render modes contribute only their discriminants (`asChild`, `render`,
 * `children`, etc.).
 */
type BaseProps<G extends PolymorphicGenerics, TAs extends ElementType> = IntrinsicPropsWithoutOwned<
  G,
  TAs
> &
  ControlProps<G, TAs>

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
 * Render callback.
 *
 * The callback receives fully resolved props (classes, refs, filtered props)
 * and is responsible for rendering the target element.
 *
 * This provides the flexibility of `asChild` without `cloneElement`.
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
 * A polymorphic React component.
 *
 * Overloads form a discriminated union:
 *
 * • `render`   → render callback
 * • `asChild`  → Slot rendering
 * • otherwise  → normal rendering
 */
export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithRender<G, TAs>): ReactElement

  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): ReactElement

  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): ReactElement

  displayName?: string
}
