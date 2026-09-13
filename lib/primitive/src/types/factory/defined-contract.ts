import type { ContractInput } from './contract-input'

/**
 * `defineContract`'s return type — the concrete, established counterpart to `ContractInput`'s
 * acceptable-structure constraint. Per the `defineContract` proposal (`DECISIONS.md`): "the
 * semantic distinction that matters is `FactoryOptions` describes *acceptable* structure,
 * `DefinedContract<O>` represents a *concrete, established* contract."
 *
 * Deliberately just `O` itself: `defineContract`'s initial implementation is a typed identity
 * function (no runtime normalization, no injected defaults for omitted `FactoryOptions` fields)
 * — its architectural value is the named boundary and the `tag`/`name` requirement `ContractInput`
 * already enforces, not runtime work. A `DefinedContract` that *widened* `O` into some
 * always-fully-populated shape (every optional field defaulted to a concrete empty value) would
 * be a lie the moment `defineContract` itself stays a pure passthrough — the type and the runtime
 * value must agree, so the type stays exactly `O` until `defineContract` actually does more.
 *
 * Single-parameter, not parameterized separately by `Props` — see `defineContract`'s own doc
 * comment for why: `Props` is never given as `defineContract`'s own explicit type argument (a
 * TypeScript `const`-type-parameter limitation makes mixing one explicit argument with a later
 * inferred one unreliable, and no real call site needs it), so there is nothing distinct from
 * `O` itself for a separate `Props` parameter to carry here.
 */
export type DefinedContract<O extends ContractInput> = O
