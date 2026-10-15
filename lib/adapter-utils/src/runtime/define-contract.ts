import type {
  ContractGenericsOf,
  ContractInput,
  ContractModelFrom,
  DefinedContract,
  ElementType,
  FactoryOptions,
  PropsOf,
  VariantProps,
  VariantsOf,
} from '@praxis-kit/core'
import type { OmitIndexSignature } from 'type-fest'

/** Props recovered from a retained Praxis Kit component contract, including plugin props. */
type RetainedComponentProps<T> = T extends { readonly __contract?: infer C }
  ? NonNullable<C> extends infer Contract extends FactoryOptions
    ? OmitIndexSignature<PropsOf<ContractGenericsOf<Contract>>> &
        OmitIndexSignature<VariantProps<VariantsOf<ContractGenericsOf<Contract>>>>
    : never
  : never

type ComposeConfigOf<O> = O extends {
  readonly compose: infer Compose
}
  ? Compose
  : never

type ComposedComponentOf<O> =
  ComposeConfigOf<O> extends {
    readonly with: infer With
  }
    ? With
    : never

type ComposeDefaultsOf<O> =
  ComposeConfigOf<O> extends {
    readonly defaults: infer Defaults
  }
    ? Defaults
    : never

/** Whether the component exposes a retained Praxis Kit contract. */
type HasRetainedComponentProps<Props> = [Props] extends [never] ? false : true

/** Keys present in any member of a union, rather than only keys common to every member. */
type KeysOfUnion<T> = T extends unknown ? keyof T : never

/** Whether defaults contain only valid props with valid values. */
type IsValidComposeDefaults<Defaults, Props> =
  Exclude<keyof Defaults, KeysOfUnion<Props>> extends never
    ? Defaults extends Partial<Props>
      ? true
      : false
    : false

/**
 * Validate compose.defaults against the retained secondary component contract.
 * External framework components without retained contracts intentionally skip validation.
 */
type ComposeDefaultsConstraint<O> =
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

type DefineContractOptions<O extends ContractInput> = O & ComposeDefaultsConstraint<O>

export function defineContract<
  const O extends ContractInput & {
    readonly tag: O['tag'] extends '' ? never : ElementType
    readonly name: O['name'] extends '' ? never : string
  },
>(options: DefineContractOptions<O>): DefinedContract<O, ContractModelFrom<O>> {
  return options as unknown as DefinedContract<O, ContractModelFrom<O>>
}
