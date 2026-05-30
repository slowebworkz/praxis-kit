import type { OwnedPropKeys } from '@praxis-ui/core'
import type { FilterPredicate } from './types'

export function composeFilter(
  ownedKeys: OwnedPropKeys,
  filterProps?: FilterPredicate,
): FilterPredicate {
  const defaultFilter: FilterPredicate = (key, variantKeys) =>
    variantKeys.has(key) || ownedKeys.has(key)

  if (!filterProps) {
    return defaultFilter
  }

  return (key, variantKeys) => defaultFilter(key, variantKeys) || filterProps(key, variantKeys)
}
