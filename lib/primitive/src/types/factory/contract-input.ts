import type { Except, SetRequired } from 'type-fest'
import type { AnyClassPluginFactory } from '../class'
import type { AnyRecord, ElementType } from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'
import type { FactoryOptions } from './factory-options'

/**
 * The author-facing input constraint for `defineContract` (`@praxis-kit/adapter-utils`) —
 * `FactoryOptions` with `tag` and `name` promoted from optional to required, and `diagnostics`
 * removed entirely.
 *
 * `tag`/`name` are required here, not just conventionally recommended, because nothing in
 * `FactoryOptions` itself enforces either: today `{}` satisfies `FactoryOptions` (and
 * `AnyFactoryOptions`), and an absent `tag` silently resolves to `'div'` inside
 * `resolveFactoryOptions` — a contract author who forgets `tag` gets no signal at all. Requiring
 * both here, at the one boundary every contract passes through before construction, closes that
 * gap without touching `FactoryOptions` itself (which stays permissive, since it's also the type
 * erased contexts like `AnyFactoryOptions` still need to describe).
 *
 * `diagnostics` is omitted, not just left optional: per `FactoryOptions.diagnostics`'s own doc
 * comment, it's adapter-resolved only ("spread in by `resolveAdapterCommonOptions`") — a contract
 * author overrides diagnostics behavior through `enforcement.diagnostics` instead, never this
 * field directly, so there's nothing for an author to supply here in the first place.
 *
 * `Props` is `ContractInput`'s first type parameter (matching `FactoryOptions`'s own field-order
 * intuition, even though `FactoryOptions` itself puts `TDefault` first) purely for readability —
 * `defineContract` does not thread an explicit `Props` type argument through its own call (see
 * that function's doc comment for why: mixing one explicit type argument with a `const`-inferred
 * later one silently disables `const` inference in this TypeScript version, and no real call site
 * in this codebase needs to give `Props` explicitly today — every `createContractComponent` call
 * across every adapter already relies on full inference, zero explicit generics). `Props` stays a
 * parameter here regardless, since `ContractInput<Props, ...>` is useful as a type annotation in
 * its own right independent of `defineContract`'s specific calling convention.
 *
 * Every other parameter's default widens to that parameter's own *bound* (`Readonly<VariantMap>`,
 * `RecipeMap<V>`, `AnyClassPluginFactory`, `ElementType`) — `AnyFactoryOptions`'s own philosophy,
 * not `FactoryOptions`'s narrower `EmptyRecord`-style defaults. This is deliberate and load-bearing:
 * `ContractInput<Props>` (only `Props` given) is used as *another* type parameter's constraint —
 * `defineContract`'s `const O extends ContractInput<Props>` — and a real author's contract (real
 * variants, a real preset, a real plugin) must structurally satisfy that fixed bound. Narrow
 * defaults there would only accept an empty-variants, no-preset, no-plugin contract; a real
 * literal with a real `styling.variants` object fails `Readonly<EmptyRecord>`, silently widening
 * `O`'s inference to the bound itself (an easy, non-obvious trap — confirmed by writing this
 * exact bug once and catching it via `defineContract`'s own round-trip test).
 */
export type ContractInput<
  Props extends AnyRecord = AnyRecord,
  TDefault extends ElementType = ElementType,
  V extends Readonly<VariantMap> = Readonly<VariantMap>,
  TPreset extends RecipeMap<V> = RecipeMap<V>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
> = SetRequired<
  Except<FactoryOptions<TDefault, Props, V, TPreset, TPlugin, TAllowed>, 'diagnostics'>,
  'tag' | 'name'
>
