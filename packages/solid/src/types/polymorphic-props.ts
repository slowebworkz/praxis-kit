import type { JSX } from 'solid-js'
import type { OmitIndexSignature, Simplify } from 'type-fest'
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
} from '@polymorphic-ui/core'
import type { UnknownProps } from './primitives'

export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = PropsOf<G> &
  // OmitIndexSignature strips the [k: string]: string|undefined leak from
  // VariantProps<VariantMap> (the default when no variants are defined).
  // Named variant keys (size, intent, …) are literal and survive the strip.
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: TAs
    class?: ClassName
    variantKey?: keyof PresetOf<G>
    ref?: (el: ElementRef<TAs>) => void
  }

type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children' | 'ref'
> &
  ControlProps<G, TAs>

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & { children?: unknown }>

export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): JSX.Element
  displayName?: string
}
