import type { ClassName } from '@praxis-kit/core'
import type { Simplify } from 'type-fest'
import type { UnknownProps } from './primitives'

// Svelte's <svelte:element> only accepts string tags, so `as` is string-only
// unlike the React/Solid/Vue adapters which accept ElementType (including components).
export type AsProp = Readonly<{ as?: string }>
export type AsChildProp = Readonly<{ asChild?: boolean }>

export type PolymorphicPropsBase = Readonly<
  Simplify<
    {
      children?: unknown
      class?: ClassName
      variantKey?: string
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>
