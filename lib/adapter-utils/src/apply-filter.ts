import type { FilterPredicate } from './types'
import type { AnyRecord } from '@praxis-ui/core'

export function applyFilter(
  props: Readonly<AnyRecord>,
  filterProps: FilterPredicate,
  variantKeys: ReadonlySet<string>,
): AnyRecord {
  const out: AnyRecord = {}
  for (const k in props) {
    if (!Object.hasOwn(props, k)) continue
    if (filterProps(k, variantKeys)) continue
    out[k] = props[k]
  }
  return out
}
