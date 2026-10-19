import type {
  ContractGenericsOf,
  ContractInput,
  FactoryOptions,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { OmitIndexSignature } from 'type-fest'

/** Props recovered from a retained Praxis Kit component contract, including plugin props. */
export type RetainedComponentProps<T> = T extends { readonly __contract?: infer C }
  ? NonNullable<C> extends infer Contract extends FactoryOptions
    ? OmitIndexSignature<PropsOf<ContractGenericsOf<Contract>>> &
        OmitIndexSignature<VariantProps<VariantsOf<ContractGenericsOf<Contract>>>>
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

/** Whether defaults contain only valid props with valid values. */
export type IsValidComposeDefaults<Defaults, Props> =
  Exclude<keyof Defaults, KeysOfUnion<Props>> extends never
    ? Defaults extends Partial<Props>
      ? true
      : false
    : false

/**
 * Validate compose.defaults against the retained secondary component contract.
 * External framework components without retained contracts intentionally skip validation.
 */
export type ComposeDefaultsConstraint<O> =
  ComposeDefaultsOf<O> extends infer Defaults
    ? [Defaults] extends [never]
      ? unknown
      : RetainedComponentProps<ComposedComponentOf<O>> extends infer Props
        ? HasRetainedComponentProps<Props> extends false
          ? unknown
          : IsValidComposeDefaults<Defaults, Props> extends true
            ? unknown
            : never
        : unknown
    : unknown

export type DefineContractOptions<O extends ContractInput> = O & ComposeDefaultsConstraint<O>
