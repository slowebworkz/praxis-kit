import type { ContractInput } from './contract-input'
import type { ContractModel, HasContractModel } from './contract-model'

/**
 * `defineContract`'s return type — `O` itself (the pure-identity return value, see that function's
 * own doc comment for why no defaults are injected), intersected with the `ContractModel` phantom
 * marker `defineContract` established from `O` at its own call site. Per the `defineContract`
 * proposal (`DECISIONS.md`): "the semantic distinction that matters is `FactoryOptions` describes
 * *acceptable* structure, `DefinedContract<O>` represents a *concrete, established* contract" —
 * `M` is exactly that establishment, made concrete and inspectable rather than left implicit in
 * `O`'s own nested optional fields.
 */
export type DefinedContract<
  O extends ContractInput,
  M extends ContractModel = ContractModel,
> = O & HasContractModel<M>
