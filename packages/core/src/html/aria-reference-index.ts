import { isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'

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
 */
export function createAriaReferenceIndex<T extends AriaIdElement>(
  elements: Iterable<T>,
): AriaReferenceIndex<T> {
  const targetsById = new Map<string, T[]>()

  iterate.forEach(elements, (element) => {
    const id = element.id
    if (!isString(id) || id.length === 0) return

    const targets = targetsById.get(id)
    if (targets) targets.push(element)
    else targetsById.set(id, [element])
  })

  const resolve = (id: string): AriaIdReferenceResolution<T> => {
    const targets = targetsById.get(id)
    if (!targets || targets.length === 0) return { status: 'missing', id }
    if (targets.length === 1) return { status: 'resolved', id, target: targets[0]! }
    return { status: 'ambiguous', id, targets: [...targets] }
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
