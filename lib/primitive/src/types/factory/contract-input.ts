import type { AnyRecord, ElementType, EmptyRecord } from '../primitives'
import type { RecipeMap, VariantMap } from '../variants'
import type { AnyClassPluginFactory } from '../class'
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
 * `Props` is deliberately the *first* type parameter here — the opposite of `FactoryOptions`'s own
 * `TDefault`-first order — because `defineContract`'s calling convention is the mirror image of
 * `createContractComponent`'s: `TDefault`/`V`/`TPreset`/`TPlugin`/`TAllowed` are all inferred
 * bottom-up from the literal contract object (`tag`, `styling.variants`, …), but `Props` can't be
 * (see `FactoryOptions.defaults`'s own `Partial<NoInfer<Props>>` — the same escape hatch this type
 * relies on), so it's the one parameter an author gives explicitly:
 * `defineContract<ButtonProps>({ tag: 'button', name: 'Button', ... })`.
 */
export type ContractInput<
  Props extends AnyRecord = EmptyRecord,
  TDefault extends ElementType = ElementType,
  V extends Readonly<VariantMap> = Readonly<EmptyRecord>,
  TPreset extends RecipeMap<V> = Readonly<EmptyRecord>,
  TPlugin extends AnyClassPluginFactory = AnyClassPluginFactory,
  TAllowed extends ElementType = ElementType,
> = Omit<FactoryOptions<TDefault, Props, V, TPreset, TPlugin, TAllowed>, 'tag' | 'name' | 'diagnostics'> & {
  readonly tag: TDefault
  readonly name: string
}
