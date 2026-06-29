import type { EnforcementOptions } from '../types'
import { iterate } from '@praxis-kit/primitive'

export function mergeContracts(...contracts: readonly EnforcementOptions[]): EnforcementOptions {
  const props = contracts.flatMap((c) => c.props ?? [])
  const aria = contracts.flatMap((c) => c.aria ?? [])
  const children = contracts.flatMap((c) => c.children ?? [])

  let strict: EnforcementOptions['strict']
  let allowedAs: EnforcementOptions['allowedAs']

  iterate.forEach(contracts, (c) => {
    if (c.strict !== undefined) strict = c.strict
    if (c.allowedAs !== undefined) allowedAs = c.allowedAs
  })

  return {
    ...(props.length > 0 && { props }),
    ...(aria.length > 0 && { aria }),
    ...(children.length > 0 && { children }),
    ...(strict !== undefined && { strict }),
    ...(allowedAs !== undefined && { allowedAs }),
  }
}
