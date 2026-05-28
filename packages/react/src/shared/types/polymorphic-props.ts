import type { Simplify } from 'type-fest'
import type { JSX, ReactElement, ReactNode, Ref } from 'react'
import type {
  ClassName,
  DefaultOf,
  ElementType,
  IntrinsicTag,
  PolymorphicGenerics,
  PresetOf,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-ui/core'
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
 * Control props owned by the polymorphic system. Separated so they can be
 * stripped from the intrinsic props via Omit before intersecting, which is
 * what lets TypeScript infer TAs from the `as` prop value.
 *
 * `asChild` and `children` are excluded — they are typed separately in the
 * discriminated union below so the slot and non-slot branches can enforce
 * different child constraints.
 */
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = PropsOf<G> &
  VariantProps<VariantsOf<G>> & {
    as?: TAs
    className?: ClassName
    variantKey?: keyof PresetOf<G>
    ref?: Ref<ElementRef<TAs>>
  }

/**
 * @internal
 * Intrinsic HTML attributes merged with control props, with `children` removed
 * so each branch of the discriminated union can type it independently.
 */
type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
> &
  ControlProps<G, TAs>

/**
 * Props for the normal (non-slot) render path. `asChild` is absent or `false`;
 * `children` accepts any `ReactNode`.
 *
 * HTML attributes are inferred from `TAs`, merged with component-defined `Props`
 * and `Variants`. Control props win on key conflicts. `Omit + intersection` is used
 * instead of `Merge` so TypeScript can infer `TAs` from the `as` prop value.
 */
export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & { asChild?: false; children?: ReactNode }>

/**
 * Props for the slot render path (`asChild: true`). One or more `ReactElement`
 * children are required. Multiple children are permitted for the Slottable
 * sibling pattern where one child is a `<Slottable>` wrapper.
 *
 * `as` is forbidden — combining `as` with `asChild` is a runtime invariant
 * violation, so it is rejected at the type level too.
 */
export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  SharedProps<G, TAs> & {
    asChild: true
    as?: never
    children: ReactElement | ReactElement[]
  }
>

/**
 * Props for the render-prop path. The `render` callback receives all resolved
 * props (className, ref, filtered component props) and returns the target element.
 * Spread the callback argument onto the element you want to receive the resolved
 * styles and attributes.
 *
 * This is the output form for the compile-time `asChild` transform: keeps the
 * same rendering flexibility as `asChild` without the `cloneElement` cost at
 * runtime. Unlike `asChild`, the render callback does not auto-merge conflicting
 * event handlers — spread position determines precedence.
 *
 * ```tsx
 * <Button render={(p) => <a href="/home" {...p} />} size="lg" />
 * ```
 */
export type PolymorphicWithRender<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  Omit<SharedProps<G, TAs>, 'children'> & {
    render: (props: RenderCallbackProps) => ReactElement
    asChild?: never
    children?: never
  }
>

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
