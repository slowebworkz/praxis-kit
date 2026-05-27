import type { Component, Snippet } from 'svelte'
import type { AnyBuiltRuntime } from './types/built-runtime'

interface PolymorphicProps {
  bundle: AnyBuiltRuntime
  as?: string
  asChild?: boolean
  class?: string
  variantKey?: string
  children?: Snippet | Snippet<[Record<string, unknown>]>
  [key: string]: unknown
}

declare const Polymorphic: Component<PolymorphicProps>
export default Polymorphic
