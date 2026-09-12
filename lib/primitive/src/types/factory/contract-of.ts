import type { FactoryOptions } from './factory-options'
import type { ContractModelOf } from './contract-model'

/**
 * `FactoryOptions`-level accessor family, mirroring `polymorphic-generics.ts`'s `*Of<T>`
 * convention (`DefaultOf<G>`, `PropsOf<G>`, etc.) but applied one layer up, to a contract itself
 * rather than to the `PolymorphicGenerics` an adapter derives from it.
 *
 * Named with a `Contract` prefix specifically to avoid colliding with `polymorphic-generics.ts`'s
 * own `PropsOf`/`VariantsOf`/`RecipeOf`/`AllowedOf`/`DefaultOf` — both families are re-exported
 * from `@praxis-kit/core`, so a name clash would be a real conflict, not a style nit.
 *
 * Each accessor is a trivial projection off `ContractModelOf<C>` (`contract-model.ts`) — the one
 * place that resolves "does `C` carry a real `ContractModel` (via `defineContract`) or does one
 * need reconstructing from `C`'s raw shape." An earlier draft had each accessor repeat that
 * resolution independently; centralizing it here means every accessor shares one implementation of
 * the tricky part (see `contract-model.ts`'s own doc comment for why that reconstruction has to be
 * a required-pattern match, not the more obvious optional-field `infer`).
 */
export type ContractTagOf<C extends FactoryOptions> = ContractModelOf<C>['tag']

/** See this file's own doc comment. Best-effort when `C` has no `ContractModel` marker — see
 *  `ExtractContractProps`'s own doc comment for why. */
export type ContractPropsOf<C extends FactoryOptions> = ContractModelOf<C>['props']

/** See this file's own doc comment. */
export type ContractVariantsOf<C extends FactoryOptions> = ContractModelOf<C>['variants']

/** See this file's own doc comment. */
export type ContractPresetOf<C extends FactoryOptions> = ContractModelOf<C>['preset']

/** See this file's own doc comment. */
export type ContractPluginOf<C extends FactoryOptions> = ContractModelOf<C>['plugin']

/** See this file's own doc comment. */
export type ContractAllowedOf<C extends FactoryOptions> = ContractModelOf<C>['allowed']
