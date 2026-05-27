import type { FilterPredicate } from './types'

export function applyFilter<T extends Readonly<Record<string, unknown>>>(
  props: T,
  filterProps: FilterPredicate,
  variantKeys: ReadonlySet<string>,
): T {
  const out = {} as T
  for (const k in props) {
    if (Object.hasOwn(props, k) && !filterProps(k, variantKeys)) {
      ;(out as Record<string, unknown>)[k] = props[k]
    }
  }
  return out
}
