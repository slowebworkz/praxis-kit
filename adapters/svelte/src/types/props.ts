import type { ClassName } from '@praxis-kit/core'
import type { Snippet } from 'svelte'
import type { Simplify } from 'type-fest'
import type { AnyBuiltRuntime } from './built-runtime'
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
      recipe?: string
    } & AsProp &
      AsChildProp
  >
>

export type KnownProps = Readonly<PolymorphicPropsBase & UnknownProps>

// Concrete public prop shape of the <Polymorphic> component itself (Polymorphic.svelte) —
// distinct from KnownProps above, which describes the abstract polymorphic-prop contract
// rather than this specific component's props (it also carries the runtime bundle).
export interface PolymorphicComponentProps {
  bundle: AnyBuiltRuntime
  // Restricted to strings: <svelte:element> only accepts string tags.
  // Svelte component `as` values are not supported in this adapter.
  as?: string
  asChild?: boolean
  class?: string
  recipe?: string
  children?: Snippet | Snippet<[UnknownProps]>
  [key: string]: unknown
}
