import type { Component, Snippet } from 'svelte'
import type { AnyBuiltRuntime } from './types/built-runtime'

interface PolymorphicProps {
  bundle: AnyBuiltRuntime
  as?: string
  class?: string
  variantKey?: string
  children?: Snippet
  [key: string]: unknown
}

declare const Polymorphic: Component<PolymorphicProps>
export default Polymorphic
