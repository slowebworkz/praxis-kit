import type { LayoutKeyName } from '@praxis-kit/tailwind'
import type { Simplify } from 'type-fest'
import type { DistributiveOmitIndexSignature } from './omit-index-signature'
import type { PolymorphicGenerics, PropsOf, VariantProps, VariantsOf } from '@praxis-kit/core'
import type { ComposedBundleGenericsOf } from './composed-generics'

/** Whether a union member declares a layout key as exactly `true`. */
type IsKeyTrueOn<M, K extends PropertyKey> = K extends keyof M
  ? [M[K]] extends [true]
    ? true
    : false
  : false

/** Layout keys that occur as literal `true` in at least one member of a prop union. */
type LayoutPluginKeys<P> = {
  [K in LayoutKeyName]-?: P extends infer M ? (IsKeyTrueOn<M, K> extends true ? K : never) : never
}[LayoutKeyName]

/**
 * Collapse the Tailwind plugin's mutually-exclusive layout-prop union for snippet prop extraction.
 * This is deliberately limited to `ResolvedSlotProps`: `GenericsOf<T>` retains the underlying
 * prop union, while a snippet needs a structurally useful object type for `Pick`, `Omit`, spreads,
 * and rest destructuring.
 */
type DataAttributes = { [K in `data-${string}`]?: string | number | boolean | undefined }

type UnionKeys<T> = T extends unknown ? keyof T : never

type UnionPropValue<T, K extends PropertyKey> = T extends unknown
  ? K extends keyof T
    ? T[K]
    : never
  : never

type FlattenLayout<P> = [P] extends [never]
  ? never
  : [LayoutPluginKeys<P>] extends [never]
    ? P
    : Simplify<
        { [K in Exclude<UnionKeys<P>, LayoutKeyName>]?: UnionPropValue<P, K> } & {
          [K in LayoutPluginKeys<P>]?: true
        }
      >

/**
 * Recovers a bundle's effective `PolymorphicGenerics` descriptor, including props and variants
 * from `compose.with` when `compose.allProps` is true.
 */
export type GenericsOf<T> = ComposedBundleGenericsOf<T>

/**
 * Props an `asChild` snippet receives once defaults, variant classes, and ARIA role resolution
 * have all run (see `buildSlotProps` in `Polymorphic.svelte`). `class` is narrowed to a resolved
 * `string`. `ref`, `role`, and `style` are intentionally left off the type — a snippet that
 * specifically needs one casts locally. `<Polymorphic>` itself can't be typed against this
 * directly (its own `children` prop stays the erased `Snippet<[UnknownProps]>`, since one
 * `.svelte` file/`.d.ts` serves every bundle's `G`) — annotate your own snippet parameter with it
 * instead:
 *
 * ```svelte
 * <Polymorphic bundle={buttonBundle} asChild>
 *   {#snippet children(props: ResolvedSlotProps<GenericsOf<typeof buttonBundle>>)}
 *     <a {...props} href="/foo">Go</a>
 *   {/snippet}
 * </Polymorphic>
 * ```
 *
 * The `ref`/`role`/`style` omissions are real design intent, not obvious from the type alone —
 * see `DECISIONS.md` → "`adapters/svelte` — `ResolvedSlotProps`'s omitted fields" for the full
 * case (Svelte has no `ref` prop concept; `role`/`style` can't be given a type that's safe to
 * spread onto an unknown target element).
 */
export type ResolvedSlotProps<G extends PolymorphicGenerics> = Partial<
  FlattenLayout<DistributiveOmitIndexSignature<PropsOf<G>>>
> &
  DataAttributes &
  DistributiveOmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    class?: string | undefined
  }
