import type { Merge } from 'type-fest'
import type { JSX, ReactElement, Ref } from 'react'
import type {
  AnyRecord,
  ClassName,
  ElementType,
  IntrinsicTag,
  VariantMap,
  VariantProps,
} from '@polymorphic-ui/core'

/** Maps a core ElementType to its DOM instance type for ref inference. */
export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

/** React JSX intrinsic props for a given element type. */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : AnyRecord

/**
 * The full prop surface for a polymorphic component rendered as `TAs`.
 *
 * HTML attributes are inferred from `TAs` (the resolved `as` prop), merged with
 * component-defined `Props` and `Variants`. Control props are applied last and
 * cannot be shadowed by intrinsic attributes or custom props.
 *
 * Merge produces a flat mapped type (Source wins on key conflicts), so the IDE
 * shows a clean resolved object rather than a nested Omit/intersection chain.
 */
export type PolymorphicProps<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
  TAs extends ElementType = TDefault,
> = Merge<
  IntrinsicJSXProps<TAs>,
  Props &
    VariantProps<Variants> & {
      as?: TAs
      asChild?: boolean
      className?: ClassName
      variantKey?: keyof TPreset
      ref?: Ref<ElementRef<TAs>>
    }
>

/**
 * A polymorphic component that infers HTML attributes and ref type from the `as` prop.
 *
 * When callers write `<MyComp as="button" ref={...} />`, TypeScript infers
 * `TAs = "button"` and types `ref` as `Ref<HTMLButtonElement>` automatically.
 */
export type PolymorphicComponent<
  TDefault extends ElementType,
  Props extends AnyRecord,
  Variants extends Readonly<VariantMap>,
  TPreset extends Record<string, Partial<VariantProps<Variants>>>,
> = {
  <TAs extends ElementType = TDefault>(
    props: PolymorphicProps<TDefault, Props, Variants, TPreset, TAs>,
  ): ReactElement
  displayName?: string
}
