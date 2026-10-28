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

/** A property-level diagnostic attached to an invalid `compose.defaults` value. */
type ComposeDefaultsError<K extends PropertyKey, Reason extends string> = {
  readonly __composeDefaultsError__: `compose.defaults[${K & string}]: ${Reason}`
}

type InvalidIndividualComposeDefaultKeys<Defaults, Props> = {
  [K in keyof Defaults]: K extends keyof Props ? (Defaults[K] extends Props[K] ? never : K) : K
}[keyof Defaults]

type ComposeDefaultsDiagnosticValues<Defaults, Props> = {
  [K in keyof Defaults]: K extends keyof Props
    ? Defaults[K] extends Props[K]
      ? [InvalidIndividualComposeDefaultKeys<Defaults, Props>] extends [never]
        ? Defaults[K] &
            ComposeDefaultsError<K, 'invalid combination of compose.defaults keys or values'>
        : Defaults[K]
      : Defaults[K] & ComposeDefaultsError<K, 'invalid value for this variant or plugin selector'>
    : Defaults[K] &
        ComposeDefaultsError<
          K,
          'not a declared variant or plugin selector of the composed component'
        >
}

type ComposeDefaultsDiagnostic<O> = O extends { readonly compose: infer Compose }
  ? Compose extends { readonly defaults: infer Defaults }
    ? {
        readonly compose: Compose & {
          readonly defaults: ComposeDefaultsDiagnosticValues<
            Defaults,
            RetainedComponentProps<ComposedComponentOf<O>>
          >
        }
      }
    : unknown
  : unknown

/**
 * Validate `compose.defaults` on the options parameter itself so TypeScript reports the problem
 * at the offending property instead of producing an unrelated rest-parameter arity error.
 * `unknown` leaves valid options unchanged; invalid values acquire a message-bearing property type.
 */
export type ComposeDefaultsValidation<O> =
  ComposeDefaultsConstraint<O> extends never ? ComposeDefaultsDiagnostic<O> : unknown
