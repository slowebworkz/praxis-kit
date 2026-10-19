import type {
  ContractInput,
  ContractModelFrom,
  DefinedContract,
  ElementType,
} from '@praxis-kit/core'
import type { DefineContractOptions } from './types'

export function defineContract<
  const O extends ContractInput & {
    readonly tag: O['tag'] extends '' ? never : ElementType
    readonly name: O['name'] extends '' ? never : string
  },
>(options: DefineContractOptions<O>): DefinedContract<O, ContractModelFrom<O>> {
  return options as unknown as DefinedContract<O, ContractModelFrom<O>>
}
