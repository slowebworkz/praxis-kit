import type { OmitIndexSignature } from 'type-fest'
import type { PolymorphicGenerics, PropsOf, VariantProps, VariantsOf } from '@praxis-kit/core'
import type { AnyBuiltRuntime, BuiltRuntime, WithChildRules } from './built-runtime'

/**
 * Recovers a bundle's `PolymorphicGenerics` descriptor from its own value type — the Svelte
 * analog of React's/Preact's `__generics` marker recovery (`@praxis-kit/contract-props`), but
 * needs no marker at all: `createContractComponent` already returns `BuiltRuntime<G, TOptions>`
 * directly (not an erased type), so `G` is a plain, ordinary type parameter to `infer` back out.
 * The second type argument is fixed to `WithChildRules` (its own upper bound) rather than
 * `infer`'d, since nothing here needs `TOptions` itself, only `G`. Falls back to the widest
 * `PolymorphicGenerics` for any non-praxis-kit bundle, the same "no marker, nothing to recover"
 * case `HasGenerics<G>`'s own `never` branch covers for React/Preact — a caller annotation, not an
 * internal assertion, so a mismatched bundle should degrade gracefully rather than poison the
 * whole expression with `never`.
 */
export type GenericsOf<T extends AnyBuiltRuntime> =
  T extends BuiltRuntime<infer G, WithChildRules> ? G : PolymorphicGenerics

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
