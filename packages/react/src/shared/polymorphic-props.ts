import type { JSX, ReactElement, Ref } from 'react'
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
 */
type ControlProps<
  TAs extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = Props &
  VariantProps<Variants> & {
    as?: TAs
    asChild?: boolean
    className?: ClassName
    variantKey?: keyof TPreset
    ref?: Ref<ElementRef<TAs>>
  }

/**
 * The full prop surface for a polymorphic component rendered as `TAs`.
 *
 * HTML attributes are inferred from `TAs` (the resolved `as` prop), merged with
 * component-defined `Props`, `Variants`, and control props. Control props win on
 * key conflicts.
 *
 * `Omit + intersection` is used instead of `Merge` so TypeScript can infer `TAs`
 * from the `as` prop value. `Merge` buries `as?: TAs` inside a mapped type that
 * TypeScript cannot see through for generic inference, causing `as="a"` to be
 * rejected when the default tag is `"button"`.
 */
export type PolymorphicProps<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
  TAs extends ElementType = TDefault,
> = Omit<IntrinsicJSXProps<TAs>, keyof ControlProps<TAs, Props, Variants, TPreset>> &
  ControlProps<TAs, Props, Variants, TPreset>

/**
 * A polymorphic component that infers HTML attributes and ref type from the `as` prop.
 *
 * When callers write `<MyComp as="button" ref={...} />`, TypeScript infers
 * `TAs = "button"` and types `ref` as `Ref<HTMLButtonElement>` automatically.
 */
export type PolymorphicComponent<
  TDefault extends ElementType,
  Props extends UnknownProps,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = {
  <TAs extends ElementType = TDefault>(
    props: PolymorphicProps<TDefault, Props, Variants, TPreset, TAs>,
  ): ReactElement
  displayName?: string
}
