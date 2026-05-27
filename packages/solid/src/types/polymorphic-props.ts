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
import type { SlotRenderFn, UnknownProps } from './primitives'

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

// When asChild is true, intrinsic DOM props (type, href, …) are not required — the
// render function owns the element and its required attributes. PropsOf<G> (component
// defaults) is made Partial because those values are filled by the runtime; callers
// should not be forced to re-supply them. ref is typed loosely because the actual
// element type depends on what the render function produces.
type AsChildProps<G extends PolymorphicGenerics> = Partial<PropsOf<G>> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: never
    asChild: true
    children: SlotRenderFn
    class?: ClassName
    variantKey?: keyof PresetOf<G>
    ref?: unknown
  }

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<(SharedProps<G, TAs> & { asChild?: false; children?: unknown }) | AsChildProps<G>>

export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): JSX.Element
  displayName?: string
}
