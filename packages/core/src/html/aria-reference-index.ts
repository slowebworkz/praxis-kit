import { isString } from '@praxis-kit/guards'
import { groupById, lookupById } from './aria-relationships/id-reference-index'

/**
 * Minimal, read-only ID index for a caller-supplied ARIA validation scope.
 *
 * This utility does not decide which elements belong in that scope, inspect DOM
 * trees, or emit diagnostics. Callers supply the relevant elements and may use
 * the result to distinguish unresolved references from duplicate-ID ambiguity.
 */
export interface AriaIdElement {
  readonly id?: string | null
}

export type AriaIdReferenceResolution<T> =
  | { readonly status: 'resolved'; readonly id: string; readonly target: T }
  | { readonly status: 'missing'; readonly id: string }
  | { readonly status: 'ambiguous'; readonly id: string; readonly targets: readonly T[] }

export interface AriaReferenceIndex<T> {
  /** Resolve one ID token without choosing arbitrarily between duplicate IDs. */
  resolve(id: string): AriaIdReferenceResolution<T>
  /** Resolve an ARIA IDREFS value, splitting on ASCII whitespace. */
  resolveList(value: string | null | undefined): readonly AriaIdReferenceResolution<T>[]
}

/**
 * Builds an index in O(n) time; each single-token lookup is O(1) on average.
 * Duplicate IDs are retained so resolution can report ambiguity rather than
 * silently selecting the first element. IDs are matched exactly and are not
 * trimmed or normalized.
 *
 * Unlike the internal relationship index, only the top-level `id` is read (no
 * `props.id` fallback) and IDREFS values split on ASCII whitespace only.
 */
export function createAriaReferenceIndex<T extends AriaIdElement>(
  elements: Iterable<T>,
): AriaReferenceIndex<T> {
  const byId = groupById(elements, (element) => element.id)

  const resolve = (id: string): AriaIdReferenceResolution<T> => {
    const found = lookupById(byId, id)
    if (found.status === 'resolved') return { status: 'resolved', id, target: found.element }
    if (found.status === 'ambiguous') {
      return { status: 'ambiguous', id, targets: [...found.matches] }
    }
    return found
  }

  return {
    resolve,
    resolveList(value) {
      if (!isString(value) || value.length === 0) return []
      const tokens = value.split(/[\t\n\f\r ]+/).filter(Boolean)
      return tokens.map(resolve)
    },
  }
}
