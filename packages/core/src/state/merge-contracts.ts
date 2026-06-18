import type { EnforcementOptions } from '../types'

export function mergeContracts(...contracts: readonly EnforcementOptions[]): EnforcementOptions {
  const props = contracts.flatMap((c) => c.props ?? [])
  const aria = contracts.flatMap((c) => c.aria ?? [])
  const children = contracts.flatMap((c) => c.children ?? [])

  let strict: EnforcementOptions['strict']
  let allowedAs: EnforcementOptions['allowedAs']

  for (const c of contracts) {
    if (c.strict !== undefined) strict = c.strict
    if (c.allowedAs !== undefined) allowedAs = c.allowedAs
  }

  return {
    ...(props.length > 0 && { props }),
    ...(aria.length > 0 && { aria }),
    ...(children.length > 0 && { children }),
    ...(strict !== undefined && { strict }),
    ...(allowedAs !== undefined && { allowedAs }),
  }
}
