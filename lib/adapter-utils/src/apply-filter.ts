import type { FilterPredicate } from './types'
import type { AnyRecord } from '@praxis-kit/core'
import { iterate } from '@praxis-kit/primitive'

export function applyFilter(
  props: Readonly<AnyRecord>,
  filterProps: FilterPredicate,
  variantKeys: ReadonlySet<string>,
): AnyRecord {
  const out: AnyRecord = {}
  iterate.forEachEntry(props, (k) => {
    if (!Object.hasOwn(props, k)) return
    if (filterProps(k, variantKeys)) return

    out[k] = props[k]
  })
  return out
}
