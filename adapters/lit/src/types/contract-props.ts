import type { OmitIndexSignature, Simplify } from 'type-fest'
import type {
  PolymorphicGenerics,
  PropsOf,
  RecipeOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { HasGenerics } from '@praxis-kit/contract-props'

/**
 * Recovers a `LitContractComponent`'s `PolymorphicGenerics` descriptor from its own value type —
 * the Lit analog of React's/Preact's `__generics` marker recovery.
 * Needs the marker (unlike Svelte's `GenericsOf<T>`,
 * `adapters/svelte/src/types/resolved-slot-props.ts`) because `createContractComponent` here
 * returns `LitContractComponent<TVariants, TPluginProps, G>`, not `BuiltRuntime<G, TOptions>`
 * directly — `TDefault`/`Props`/`TPreset` are genuinely erased from the return type, not merely
 * hidden, so there is no ordinary type parameter left to `infer` them back out of.
 * `LitContractComponent`'s own `__generics` field (`./primitives`) exists purely to make this
 * recovery possible. Falls back to the widest `PolymorphicGenerics` for any non-praxis-kit value,
 * the same "no marker, nothing to recover" case `HasGenerics<G>`'s own `never` branch covers for
 * React/Preact.
 */
export type GenericsOf<T extends HasGenerics<PolymorphicGenerics>> =
  T extends HasGenerics<infer G extends PolymorphicGenerics> ? G : PolymorphicGenerics

/**
 * A component's full prop contract — the attributes a caller can set on the custom element,
 * recovered from outside the file that built it. Lit has exactly one render mode (no
 * `asChild`/`render` — see the "known limitations" note atop `conformance.test.ts`), so unlike
 * React's/Preact's `ContractProps<T, Mode>` this takes no `Mode` parameter: there is only ever one
 * prop shape to pick.
 *
 * `as?: never` — deliberately absent, not merely undocumented. Every other adapter's `as` is real
 * tag polymorphism (it changes the rendered host element); Lit's custom-element tag is fixed at
 * `customElements.define()` time, so there is nothing for `as` to do here. `createContractComponent`
 * strips it from the prop pipeline entirely (see that function's own doc comment) — this `never`
 * makes that a type-level fact too, so `{ as: 'a' }` written against `ContractProps<T>` is a compile
 * error, not a silently-ignored no-op a caller could believe was doing something.
 *
 * `data-*` attributes pass through (`DataAttributes` below). `_buildProps()` in
 * `createContractComponent` scans every attribute set on the custom element into the pipeline, so
 * `<praxis-button data-slot="…">` is real, forwarded input — a `data-*` a contract sets in
 * `defaults` (`data-slot`, the near-universal styling hook) has to be a member of `ContractProps`
 * for a consumer to type it. Other global/host attributes (`id`, `class`, `slot`, `aria-*`,
 * `role`) are equally accepted on the element but are *not* part of this type: they are DOM
 * globals a caller sets on the element directly, not part of a component's declared prop contract.
 * `data-*` is the exception because contracts author it as an overridable prop.
 *
 * ```ts
 * const Button = createContractComponent({ tag: 'button', name: 'Button', /* ... *\/ })
 *
 * type ButtonProps = ContractProps<typeof Button>
 * ```
 */
export type ContractProps<T extends HasGenerics<PolymorphicGenerics>> = Simplify<
  OmitIndexSignature<PropsOf<GenericsOf<T>>> &
    OmitIndexSignature<VariantProps<VariantsOf<GenericsOf<T>>>> &
    DataAttributes & {
      as?: never
      recipe?: keyof RecipeOf<GenericsOf<T>>
    }
>

/**
 * `data-*` attribute passthrough. The value type is `string | number | boolean | undefined` —
 * what a `data-*` attribute serializes to (mirrors the React adapter's own `DataAttributes`).
 */
type DataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined
}
