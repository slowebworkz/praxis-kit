import type { JSX, ReactElement, ReactNode, Ref } from 'react'
import type {
  ClassName,
  ElementType,
  IntrinsicTag,
  VariantMap,
  VariantProps,
} from '@polymorphic-ui/core'
import type { UnknownProps } from './types'

/** Maps a core ElementType to its DOM instance type for ref inference. */
export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

/** React JSX intrinsic props for a given element type. */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

/**
 * Control props owned by the polymorphic system. Separated so they can be
 * stripped from the intrinsic props via Omit before intersecting, which is
 * what lets TypeScript infer TAs from the `as` prop value.
 *
 * `asChild` and `children` are excluded — they are typed separately in the
 * discriminated union below so the slot and non-slot branches can enforce
 * different child constraints.
 */
type ControlProps<
  TAs extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = Props &
  VariantProps<Variants> & {
    as?: TAs
    className?: ClassName
    variantKey?: keyof TPreset
    ref?: Ref<ElementRef<TAs>>
  }

/**
 * Intrinsic HTML attributes merged with control props, with `children` removed
 * so each branch of the discriminated union can type it independently.
 */
type SharedProps<
  TAs extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = Omit<IntrinsicJSXProps<TAs>, keyof ControlProps<TAs, Props, Variants, TPreset> | 'children'> &
  ControlProps<TAs, Props, Variants, TPreset>

/**
 * Props for the normal (non-slot) render path. `asChild` is absent or `false`;
 * `children` accepts any `ReactNode`.
 *
 * HTML attributes are inferred from `TAs`, merged with component-defined `Props`
 * and `Variants`. Control props win on key conflicts. `Omit + intersection` is used
 * instead of `Merge` so TypeScript can infer `TAs` from the `as` prop value.
 */
export type PolymorphicProps<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
  TAs extends ElementType = TDefault,
> = SharedProps<TAs, Props, Variants, TPreset> & { asChild?: false; children?: ReactNode }

/**
 * Props for the slot render path (`asChild: true`). One or more `ReactElement`
 * children are required. Multiple children are permitted for the Slottable
 * sibling pattern where one child is a `<Slottable>` wrapper.
 */
export type PolymorphicWithAsChild<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
  TAs extends ElementType = TDefault,
> = SharedProps<TAs, Props, Variants, TPreset> & {
  asChild: true
  children: ReactElement | ReactElement[]
}

/**
 * A polymorphic component that infers HTML attributes and ref type from the `as` prop.
 *
 * Two call signatures form a discriminated union on `asChild`:
 * - `asChild: true`  → slot path; exactly one `ReactElement` child required
 * - `asChild?: false` → normal path; any `ReactNode` children accepted
 */
export type PolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = {
  <TAs extends ElementType = TDefault>(
    props: PolymorphicWithAsChild<TDefault, Props, Variants, TPreset, TAs>,
  ): ReactElement
  <TAs extends ElementType = TDefault>(
    props: PolymorphicProps<TDefault, Props, Variants, TPreset, TAs>,
  ): ReactElement
  displayName?: string
}
