import { isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import type { AnyRecord } from '@praxis-kit/primitive'

/** Minimal element shape accepted by the document-level ARIA relationship checks. */
export interface AriaReferenceElement {
  readonly id?: unknown
  readonly props?: Readonly<AnyRecord>
  readonly role?: unknown
  /** Optional structural parent ID supplied by a tree-aware caller. */
  readonly parentId?: unknown
}

export type AriaIdLookup =
  | { readonly status: 'missing'; readonly id: string }
  | {
      readonly status: 'ambiguous'
      readonly id: string
      readonly matches: readonly AriaReferenceElement[]
    }
  | { readonly status: 'resolved'; readonly id: string; readonly element: AriaReferenceElement }

export type AriaResolvedLookup = Extract<AriaIdLookup, { readonly status: 'resolved' }>
export type AriaUnresolvedLookup = Exclude<AriaIdLookup, { readonly status: 'resolved' }>

export function isResolvedLookup(lookup: AriaIdLookup): lookup is AriaResolvedLookup {
  return lookup.status === 'resolved'
}

export function isUnresolvedLookup(lookup: AriaIdLookup): lookup is AriaUnresolvedLookup {
  return lookup.status !== 'resolved'
}

/** Indexes non-empty string IDs without silently choosing between duplicates. */
export function createAriaReferenceIndex(elements: readonly AriaReferenceElement[]) {
  const byId = new Map<string, AriaReferenceElement[]>()
  iterate.forEach(elements, (element) => {
    const id = isString(element.id) ? element.id : element.props?.id
    if (isString(id) && id.length > 0) {
      const matches = byId.get(id) ?? []
      matches.push(element)
      byId.set(id, matches)
    }
  })

  const lookup = (id: string): AriaIdLookup => {
    const matches = byId.get(id) ?? []
    const [element, ...duplicates] = matches
    if (!element) return { status: 'missing', id }
    if (duplicates.length > 0) return { status: 'ambiguous', id, matches }
    return { status: 'resolved', id, element }
  }

  return {
    lookup,
    resolveList(value: unknown): readonly AriaIdLookup[] {
      if (!isString(value)) return []
      return (value.match(/\S+/g) ?? []).map(lookup)
    },
  }
}

export type AriaReferenceIndex = ReturnType<typeof createAriaReferenceIndex>
