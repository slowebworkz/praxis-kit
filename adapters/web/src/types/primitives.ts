import type {
  AnyRecord,
  EmptyRecord,
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
 */
export type WebContractComponent<
  TVariants extends Readonly<VariantMap> = NoVariants,
  TPluginProps extends AnyRecord = EmptyRecord,
  G extends PolymorphicGenerics = PolymorphicGenerics,
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
}
