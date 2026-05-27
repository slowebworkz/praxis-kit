import type { ClassName } from '@praxis-ui/core'
import type { Simplify } from 'type-fest'
import type { UnknownProps, VariantKey } from './primitives'

// Svelte's <svelte:element> only accepts string tags, so `as` is string-only
// unlike the React/Solid/Vue adapters which accept ElementType (including components).
export type AsProp = Readonly<{ as?: string }>
export type AsChildProp = Readonly<{ asChild?: boolean }>

export type PolymorphicPropsBase = Readonly<
  Simplify<
    {
      children?: unknown
      class?: ClassName
      variantKey?: VariantKey
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>
