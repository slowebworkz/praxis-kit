import type { FactoryOptions } from '@praxis-kit/core'

export function defineContractComponent<O extends FactoryOptions>(options: O) {
  return <R>(factory: (options: O) => R): R => factory(options)
}
