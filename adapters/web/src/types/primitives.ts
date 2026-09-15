import type {
  AnyRecord,
  EmptyRecord,
  FactoryOptions,
  NoVariants,
  PolymorphicGenerics,
  VariantMap,
} from '@praxis-kit/core'
import type { Diagnostics } from '@praxis-kit/diagnostics'

export type UnknownProps = AnyRecord

// Resolved DOM attribute values built for spreading onto the host element (applyHostState
// in create-contract-component.ts) or serializing to a string (render-to-string.ts) —
// distinct role from UnknownProps (arbitrary input props) even though the shape is identical.
export type ResolvedAttributes = AnyRecord

/**
 * Constructor type returned by createContractComponent.
 *
 * Describes the public contract without exposing HTMLElement's internal members.
 * Variant key instance properties are typed via TVariants.
 *
 * No `as` field, unlike an earlier design — see the `as` note on
 * `createContractComponent`'s own doc comment for why: a custom element's tag is
 * fixed at `customElements.define()` time, so there is no tag for `as` to switch.
 *
 * `G` is a phantom marker only — see `__generics` below — and defaults to the
 * widest `PolymorphicGenerics` so existing two-argument usages of this type keep
 * resolving exactly as before. Mirrors the Lit adapter's `LitContractComponent`.
 *
 * `C` is a second phantom marker — see `__contract` below — added alongside `G`, not replacing
 * it (Phase 3 of the `defineContract` refactor), defaulting to the widest `FactoryOptions` for the
 * same reason. Mirrors `LitContractComponent`'s identical addition.
 */
export type WebContractComponent<
  TVariants extends Readonly<VariantMap> = NoVariants,
  TPluginProps extends AnyRecord = EmptyRecord,
  G extends PolymorphicGenerics = PolymorphicGenerics,
  C extends FactoryOptions = FactoryOptions,
> = {
  new (): HTMLElement & {
    recipe: string | undefined
    praxisClass: string | undefined
    /** Re-runs the pipeline — call after setting non-reactive attributes (aria-*, role, data-*)
     *  or a praxis-owned property directly (property assignment doesn't trigger
     *  attributeChangedCallback — see createContractComponent's own doc comment). */
    update(): void
  } & { [K in Extract<keyof TVariants, string>]?: string | null } & TPluginProps
  /** The resolved diagnostics for this component — usable by subclasses for custom enforcement. */
  readonly diagnostics: Diagnostics

  /**
   * Type-only; never assigned at runtime. `createContractComponent` erases
   * `TDefault`/`TProps`/`TPreset` entirely from its return type — only `TVariants`
   * and `TPluginProps` survive as real instance-shape information. This field
   * carries the full `PolymorphicGenerics` the component was built from so
   * `GenericsOf`/`ContractProps` (`./contract-props`) can recover it from outside
   * the file that built it — identical to `LitContractComponent.__generics`.
   */
  readonly __generics?: G

  /**
   * Type-only; never assigned at runtime — same rationale as `__generics` above and
   * React's/Preact's `__contract` (see `HasContract<C>`, `@praxis-kit/contract-props`). Carries
   * the *complete* contract this component was built from (`C`, the argument
   * `createContractComponent<C extends WebFactoryOptions>` was actually called with), not just
   * its `PolymorphicGenerics` projection. `GenericsOf`/`ContractProps` (./contract-props) recover
   * `G` *through* this field now (`ContractGenericsOf<C>`), rather than from a separately-computed
   * `G` that never carried plugin-contributed props — see that file's doc comment for the bug this
   * closes. Mirrors `LitContractComponent.__contract`.
   */
  readonly __contract?: C
}
