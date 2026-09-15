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
 * `FactoryOptions` itself enforces either: today `{}` satisfies `FactoryOptions`, and an absent
 * `tag` silently resolves to `'div'` inside `resolveFactoryOptions` — a contract author who forgets
 * `tag` gets no signal at all. Requiring both here, at the one boundary every contract passes
 * through before construction, closes that gap without touching `FactoryOptions` itself (which
 * stays permissive, since it's also the type any type-erased context still needs to describe).
 *
 * `diagnostics` is omitted, not just left optional: per `FactoryOptions.diagnostics`'s own doc
 * comment, it's adapter-resolved only ("spread in by `resolveAdapterCommonOptions`") — a contract
 * author overrides diagnostics behavior through `enforcement.diagnostics` instead, never this
 * field directly, so there's nothing for an author to supply here in the first place.
 *
 * `Props` is `ContractInput`'s first type parameter (matching `FactoryOptions`'s own field-order
 * intuition, even though `FactoryOptions` itself puts `TDefault` first) purely for readability as a
 * standalone type annotation — `defineContract` itself constrains its own `const O` against the
 * bare, all-defaulted `ContractInput` (see that function's own doc comment), never
 * `ContractInput<Props>` with `Props` given explicitly.
 *
 * Every other parameter's default widens to that parameter's own *bound* (`Readonly<VariantMap>`,
 * `RecipeMap<V>`, `AnyClassPluginFactory`, `ElementType`), not `FactoryOptions`'s narrower
 * `EmptyRecord`-style defaults — deliberate and load-bearing: a real author's contract (real
 * variants, a real preset, a real plugin) must structurally satisfy whatever bound this type
 * presents, and a narrow bound would only accept an empty-variants, no-preset, no-plugin contract.
 * See `DECISIONS.md`'s `defineContract` entry for the concrete bug this bound choice fixes.
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
