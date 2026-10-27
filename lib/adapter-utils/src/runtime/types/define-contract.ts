import type {
  ContractGenericsOf,
  ContractInput,
  ContractPluginOf,
  ExtractPluginProps,
  FactoryOptions,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { OmitIndexSignature, Simplify } from 'type-fest'

/** Variant props declared by a contract's `styling.variants`. */
type ContractVariantDefaults<C extends FactoryOptions> = OmitIndexSignature<
  VariantProps<VariantsOf<ContractGenericsOf<C>>>
>

/** Selector props contributed by a contract's own styling plugin. */
type ContractPluginDefaults<C extends FactoryOptions> = OmitIndexSignature<
  ExtractPluginProps<ContractPluginOf<C>>
>

/** Defaults accepted from a retained Praxis Kit component contract.
 *
 * `compose.defaults` may configure declared variants and selector props contributed by the
 * composed contract's own styling plugin. Ordinary component props and HTML attributes remain
 * excluded. Plugin props come from the composed contract, never the primary contract.
 */
export type RetainedComponentProps<T> = T extends { readonly __contract?: infer C }
  ? NonNullable<C> extends infer Contract extends FactoryOptions
    ? Simplify<ContractVariantDefaults<Contract> & ContractPluginDefaults<Contract>>
    : never
  : never

export type ComposeConfigOf<O> = O extends {
  readonly compose: infer Compose
}
  ? Compose
  : never

export type ComposedComponentOf<O> =
  ComposeConfigOf<O> extends {
    readonly with: infer With
  }
    ? With
    : never

export type ComposeDefaultsOf<O> =
  ComposeConfigOf<O> extends {
    readonly defaults: infer Defaults
  }
    ? Defaults
    : never

/** Whether the component exposes a retained Praxis Kit contract. */
export type HasRetainedComponentProps<Props> = [Props] extends [never] ? false : true

/** Keys present in any member of a union, rather than only keys common to every member. */
export type KeysOfUnion<T> = T extends unknown ? keyof T : never

/** Whether defaults contain only supported variant and plugin-selector keys with valid values. */
export type IsValidComposeDefaults<Defaults, Props> =
  Exclude<keyof Defaults, KeysOfUnion<Props>> extends never
    ? Defaults extends Partial<Props>
      ? true
      : false
    : false

/** Skips validation without a retained contract; otherwise `never` unless defaults are valid. */
type ValidateRetainedComposeDefaults<Defaults, Props> =
  HasRetainedComponentProps<Props> extends false
    ? unknown
    : IsValidComposeDefaults<Defaults, Props> extends true
      ? unknown
      : never

/**
 * Validate compose.defaults against the retained secondary component’s variants and plugin selectors.
 * External framework components without retained contracts intentionally skip validation.
 */
export type ComposeDefaultsConstraint<O> =
  ComposeDefaultsOf<O> extends infer Defaults
    ? [Defaults] extends [never]
      ? unknown
      : ValidateRetainedComposeDefaults<Defaults, RetainedComponentProps<ComposedComponentOf<O>>>
    : unknown

export type DefineContractOptions<O extends ContractInput> = O & ComposeDefaultsConstraint<O>

/**
 * Deferred public-factory validation for `compose.defaults`.
 *
 * A rest tuple checks the fully inferred options type after the primary parameter has inferred
 * `O`, avoiding the inference collapse caused by intersecting `O` with its own constraint.
 */
export type ComposeDefaultsValidationArgs<O> =
  ComposeDefaultsConstraint<O> extends never ? [invalidComposeDefaults: never] : []
