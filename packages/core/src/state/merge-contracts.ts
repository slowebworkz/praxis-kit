import type { EnforcementOptions } from '../types'
import { iterate } from '@praxis-kit/primitive'

export function mergeContracts(...contracts: readonly EnforcementOptions[]): EnforcementOptions {
  const props = contracts.flatMap((c) => c.props ?? [])
  const aria = contracts.flatMap((c) => c.aria ?? [])
  const rules = contracts.flatMap((c) => c.rules ?? [])
  const children = contracts.flatMap((c) => c.children ?? [])

  let diagnostics: EnforcementOptions['diagnostics']
  let allowedAs: EnforcementOptions['allowedAs']

  iterate.forEach(contracts, (c) => {
    if (c.diagnostics !== undefined) diagnostics = c.diagnostics
    if (c.allowedAs !== undefined) allowedAs = c.allowedAs
  })

  return {
    ...(props.length > 0 && { props }),
    ...(aria.length > 0 && { aria }),
    ...(rules.length > 0 && { rules }),
    ...(children.length > 0 && { children }),
    ...(diagnostics !== undefined && { diagnostics }),
    ...(allowedAs !== undefined && { allowedAs }),
  }
}
