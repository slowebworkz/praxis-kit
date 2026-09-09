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

/**
 * Props accepted by `<Polymorphic>`, the component every `createContractComponent` bundle
 * renders through in the Svelte adapter — distinct from `KnownProps` above, which describes
 * the abstract polymorphic-prop contract rather than this specific component's props (it also
 * carries the runtime bundle).
 *
 * `children` is intentionally generic-erased (`Snippet | Snippet<[UnknownProps]>`, not typed
 * against any particular bundle's `PolymorphicGenerics`) — a deliberate design decision, not a
 * type-system workaround. One physical `Polymorphic.svelte` (and its `.svelte.d.ts`) serves every
 * bundle's `G`; it cannot become `Polymorphic<G1>` vs. `Polymorphic<G2>` per call site the way a
 * generic React function component can. Bundle-specific prop precision for an `asChild` snippet is
 * recovered on the *caller's* side instead, via `ResolvedSlotProps<GenericsOf<typeof bundle>>` —
 * see that type's own doc comment.
 */
export interface PolymorphicComponentProps {
  /** The contract bundle to render, from `createContractComponent`. */
  bundle: AnyBuiltRuntime
  /** Overrides the default tag. String-only: `<svelte:element>` only accepts string tags. */
  as?: string
  /** Renders `children` as a snippet receiving the resolved props, instead of the host element. */
  asChild?: boolean
  /** Caller class, merged with the resolved variant classes. */
  class?: string
  /** Selects a named preset from `styling.presets`. */
  recipe?: string
  children?: Snippet | Snippet<[UnknownProps]>
  [key: string]: unknown
}
