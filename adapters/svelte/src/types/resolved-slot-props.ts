import type { OmitIndexSignature } from 'type-fest'
import type { PolymorphicGenerics, PropsOf, VariantProps, VariantsOf } from '@praxis-kit/core'
import type { ComposedBundleGenericsOf } from './composed-generics'

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
  OmitIndexSignature<PropsOf<G>>
> &
  OmitIndexSignature<VariantProps<VariantsOf<G>>> & {
    class?: string | undefined
  }
