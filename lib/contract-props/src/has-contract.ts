/**
 * The phantom-marker shape read back via `T extends HasContract<infer C> ? C : never` — the
 * contract-retention counterpart to `HasGenerics<G>` in this same package. Where `HasGenerics<G>`
 * lets a built component recover the `PolymorphicGenerics` an adapter derived for it,
 * `HasContract<C>` lets it recover the *complete, authoritative contract* (`C`, the argument
 * `createContractComponent<C extends XFactoryOptions>` was actually called with) it was derived
 * from — the two are deliberately separate markers, not one broadened to do both jobs: `G` is
 * "what the adapter needs to implement the component," `C` is "what the component was configured
 * with" (see `DECISIONS.md`'s `defineContract` entry). A component carries both.
 *
 * Type-only: never assigned at runtime, same rationale as `HasGenerics<G>` (see that type's own
 * doc comment) — a `createContractComponent` return value gets this shape via a type assertion,
 * not a real property write.
 *
 * Unconstrained (no `C extends FactoryOptions` bound), matching `HasGenerics<G>`'s own choice —
 * this package has no dependency on `@praxis-kit/core`/`@praxis-kit/primitive`, and adding one
 * just to write a bound here isn't worth it: the accessor types that actually consume `C`
 * (`ContractTagOf<C>`, etc., in `@praxis-kit/primitive`) already declare their own constraint.
 *
 * Do **not** "harden" this with a `unique symbol` or other nominal brand, for the same reason
 * `HasGenerics<G>` doesn't: a real component's callable type needs to structurally satisfy this
 * shape by declaring the same inline optional field, not by importing a nominal brand.
 */
export interface HasContract<C> {
  readonly __contract?: C
}
