import { isNumber, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex } from './aria-reference-index'

/** Minimal element shape for listbox relationship checks. */
export interface AriaListboxElement {
  readonly id?: string | null
  readonly parentIndex?: number | null
  readonly props?: Readonly<Record<string, unknown>>
}

export type AriaListboxRelationshipIssue =
  | 'option-without-listbox-owner'
  | 'aria-owns-target-not-option'
  | 'active-descendant-not-option'
  | 'active-descendant-not-owned'
  | 'active-descendant-ambiguous'
  | 'active-descendant-missing'

export interface AriaListboxRelationshipDiagnostic {
  readonly elementIndex: number
  readonly issue: AriaListboxRelationshipIssue
  readonly reference?: string
  readonly targetIndex?: number
}

function roleOf(element: AriaListboxElement): unknown {
  return element.props?.role
}

/**
 * Checks listbox/option ownership within a caller-supplied, ordered element
 * scope. `parentIndex` represents the immediate parent in that scope; `aria-owns`
 * may additionally establish ownership. This is a structural utility, not a DOM
 * walker, and does not validate selection or keyboard interaction.
 */
export function validateAriaListboxRelationships(
  elements: readonly AriaListboxElement[],
): readonly AriaListboxRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const diagnostics: AriaListboxRelationshipDiagnostic[] = []

  const isDescendantOf = (elementIndex: number, ancestorIndex: number): boolean => {
    let parentIndex = elements[elementIndex]?.parentIndex
    const visited = new Set<number>()
    while (isNumber(parentIndex) && parentIndex >= 0 && parentIndex < elements.length) {
      if (parentIndex === ancestorIndex) return true
      if (visited.has(parentIndex)) return false
      visited.add(parentIndex)
      parentIndex = elements[parentIndex]?.parentIndex
    }
    return false
  }

  const isOwnedBy = (optionIndex: number, listboxIndex: number): boolean => {
    if (isDescendantOf(optionIndex, listboxIndex)) return true
    const owns = elements[listboxIndex]?.props?.['aria-owns']
    if (!isString(owns)) return false
    return iterate.some(
      index.resolveList(owns),
      (resolution) =>
        resolution.status === 'resolved' && resolution.target === elements[optionIndex],
    )
  }

  iterate.forEach(elements, (element, elementIndex) => {
    if (roleOf(element) === 'option') {
      const hasListboxOwner = elements.some(
        (candidate, candidateIndex) =>
          roleOf(candidate) === 'listbox' && isOwnedBy(elementIndex, candidateIndex),
      )
      if (!hasListboxOwner) {
        diagnostics.push({ elementIndex, issue: 'option-without-listbox-owner' })
      }
    }

    if (roleOf(element) !== 'listbox') return
    const activeDescendant = element.props?.['aria-activedescendant']
    if (!isString(activeDescendant) || activeDescendant.length === 0) return

    iterate.forEach(index.resolveList(activeDescendant), (resolution) => {
      if (resolution.status === 'missing') {
        diagnostics.push({
          elementIndex,
          issue: 'active-descendant-missing',
          reference: resolution.id,
        })
      } else if (resolution.status === 'ambiguous') {
        diagnostics.push({
          elementIndex,
          issue: 'active-descendant-ambiguous',
          reference: resolution.id,
        })
      } else {
        const targetIndex = elements.indexOf(resolution.target)
        if (roleOf(resolution.target) !== 'option') {
          diagnostics.push({
            elementIndex,
            issue: 'active-descendant-not-option',
            reference: resolution.id,
            targetIndex,
          })
        } else if (!isOwnedBy(targetIndex, elementIndex)) {
          diagnostics.push({
            elementIndex,
            issue: 'active-descendant-not-owned',
            reference: resolution.id,
            targetIndex,
          })
        }
      }
    })
  })

  return diagnostics
}
