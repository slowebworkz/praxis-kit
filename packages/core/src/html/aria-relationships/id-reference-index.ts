import { isDefined, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import type {
  AriaIdLookup,
  AriaIdLookupIndex,
  AriaReferenceElement,
  AriaResolvedLookup,
  AriaUnresolvedLookup,
} from './types'

export function isResolvedLookup(lookup: AriaIdLookup): lookup is AriaResolvedLookup {
  return lookup.status === 'resolved'
}

export function isUnresolvedLookup(lookup: AriaIdLookup): lookup is AriaUnresolvedLookup {
  return lookup.status !== 'resolved'
}

/**
 * Groups elements by their non-empty string id, as chosen by `idOf`. Duplicates are kept in
 * encounter order so lookups can report ambiguity instead of picking one.
 */
export function groupById<T>(
  elements: Iterable<T>,
  idOf: (element: T) => unknown,
): ReadonlyMap<string, readonly T[]> {
  const byId = new Map<string, T[]>()
  iterate.forEach(elements, (element) => {
    const id = idOf(element)
    if (isString(id) && id.length > 0) {
      const matches = byId.get(id) ?? []
      matches.push(element)
      byId.set(id, matches)
    }
  })
  return byId
}

/** Classifies one id token against a grouped index. */
export function lookupById<T>(
  byId: ReadonlyMap<string, readonly T[]>,
  id: string,
): AriaIdLookup<T> {
  const matches = byId.get(id) ?? []
  const [element, ...duplicates] = matches
  if (!isDefined(element)) return { status: 'missing', id }
  if (duplicates.length > 0) return { status: 'ambiguous', id, matches }
  return { status: 'resolved', id, element }
}

/**
 * Indexes non-empty string IDs without silently choosing between duplicates. An element's
 * id is its top-level `id` when that is a string, otherwise `props.id`. IDREFS values are
 * split on any whitespace (`\S+`).
 */
export function createAriaReferenceIndex(
  elements: readonly AriaReferenceElement[],
): AriaIdLookupIndex {
  const byId = groupById(elements, (element) =>
    isString(element.id) ? element.id : element.props?.id,
  )
  const lookup = (id: string): AriaIdLookup => lookupById(byId, id)

  return {
    lookup,
    resolveList(value) {
      if (!isString(value)) return []
      return (value.match(/\S+/g) ?? []).map(lookup)
    },
  }
}
