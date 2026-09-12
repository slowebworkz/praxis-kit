import type { FactoryOptions } from './factory-options'
import type {
  ExtractContractAllowed,
  ExtractContractPlugin,
  ExtractContractPreset,
  ExtractContractProps,
  ExtractContractTag,
  ExtractContractVariants,
  HasContractModel,
} from './contract-model'

/**
 * `FactoryOptions`-level accessor family, mirroring `polymorphic-generics.ts`'s `*Of<T>`
 * convention (`DefaultOf<G>`, `PropsOf<G>`, etc.) but applied one layer up, to a contract itself
 * rather than to the `PolymorphicGenerics` an adapter derives from it.
 *
 * Named with a `Contract` prefix specifically to avoid colliding with `polymorphic-generics.ts`'s
 * own `PropsOf`/`VariantsOf`/`RecipeOf`/`AllowedOf`/`DefaultOf` — both families are re-exported
 * from `@praxis-kit/core`, so a name clash would be a real conflict, not a style nit.
 *
 * Each accessor checks `C`'s `ContractModel` phantom marker first — a plain, required-field index
 * access (`M['tag']`, etc.), no ambiguity possible — and falls back to matching `C` directly (via
 * `contract-model.ts`'s `Extract*` helpers, the same required-pattern-match technique
 * `defineContract` itself uses) only when no marker is present, e.g. a raw literal handed straight
 * to `createContractComponent` without going through `defineContract` first — supporting that
 * still-valid, pre-refactor ergonomic rather than requiring the extra ceremony everywhere.
 *
 * An earlier draft of this file derived every dimension from `FactoryOptions`'s own *optional*
 * fields at every accessor call, with no model in between — confirmed broken for the common case
 * of an absent field (an unconstrained `infer` resolves to the field's declared *constraint*, not
 * a tight empty default, with no evidence to say otherwise) — see `contract-model.ts`'s own doc
 * comment for the full story. The model is the fix: establish each dimension unambiguously once,
 * with real evidence, and read it back by plain index access everywhere after.
 */
export type ContractTagOf<C extends FactoryOptions> = C extends HasContractModel<infer M>
  ? M['tag']
  : ExtractContractTag<C>

/** See this file's own doc comment. Best-effort when falling back to direct extraction (no
 *  `ContractModel` marker present) — see `ExtractContractProps`'s own doc comment for why. */
export type ContractPropsOf<C extends FactoryOptions> = C extends HasContractModel<infer M>
  ? M['props']
  : ExtractContractProps<C>

/** See this file's own doc comment. */
export type ContractVariantsOf<C extends FactoryOptions> = C extends HasContractModel<infer M>
  ? M['variants']
  : ExtractContractVariants<C>

/** See this file's own doc comment. */
export type ContractPresetOf<C extends FactoryOptions> = C extends HasContractModel<infer M>
  ? M['preset']
  : ExtractContractPreset<C>

/** See this file's own doc comment. */
export type ContractPluginOf<C extends FactoryOptions> = C extends HasContractModel<infer M>
  ? M['plugin']
  : ExtractContractPlugin<C>

/** See this file's own doc comment. */
export type ContractAllowedOf<C extends FactoryOptions> = C extends HasContractModel<infer M>
  ? M['allowed']
  : ExtractContractAllowed<C>
