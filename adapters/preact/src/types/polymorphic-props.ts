import type { JSX, Ref } from 'preact'
import type { AnyVNode } from './primitives'
import type { OmitIndexSignature, Simplify } from 'type-fest'
import type {
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
import type { UnknownProps } from './primitives'

export type ElementRef<T extends ElementType> = T extends IntrinsicTag
  ? HTMLElementTagNameMap[T]
  : unknown

type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag
  ? JSX.IntrinsicElements[T]
  : UnknownProps

type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = OmitIndexSignature<
  PropsOf<G>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: TAs
    className?: ClassName | undefined
    recipe?: keyof RecipeOf<G>
    ref?: Ref<ElementRef<TAs>>
  }

type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<
  IntrinsicJSXProps<TAs>,
  keyof ControlProps<G, TAs> | 'children'
> &
  ControlProps<G, TAs>

export type PolymorphicProps<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<SharedProps<G, TAs> & { asChild?: false; children?: unknown }>

export type PolymorphicWithAsChild<
  G extends PolymorphicGenerics,
  TAs extends ElementType = DefaultOf<G>,
> = Simplify<
  SharedProps<G, TAs> & {
    asChild: true
    as?: never
    children: AnyVNode | AnyVNode[]
  }
>

export type PolymorphicComponent<G extends PolymorphicGenerics> = {
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): AnyVNode
  <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): AnyVNode
  displayName?: string
}
