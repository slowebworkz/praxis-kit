import { isNumber, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex } from './aria-reference-index'
import { hasProp, roleOf } from './aria-relationships/shared'
import type { AriaReferenceElement } from './aria-relationships/types'

/** Minimal element shape for listbox relationship checks. */
export interface AriaListboxElement extends AriaReferenceElement {
  /** Position of the immediate parent in the supplied element sequence. */
  readonly parentIndex?: number | null
}

export type AriaListboxRelationshipIssue =
  | 'option-without-listbox-owner'
  | 'aria-owns-target-not-option'
  | 'active-descendant-not-option'
  | 'active-descendant-not-owned'
  | 'active-descendant-ambiguous'
  | 'active-descendant-missing'
  | 'mixed-option-selection-state'

export interface AriaListboxRelationshipDiagnostic {
  readonly elementIndex: number
  readonly issue: AriaListboxRelationshipIssue
  readonly reference?: string
  readonly targetIndex?: number
}

/**
 * Checks listbox/option ownership within a caller-supplied, ordered element
 * scope. `parentIndex` represents the immediate parent in that scope; `aria-owns`
 * may additionally establish ownership. It also warns when a listbox mixes
 * `aria-selected` and `aria-checked` as option selection mechanisms. This is not
 * a DOM walker and does not validate selection values or keyboard interaction.
 */
export function validateAriaListboxRelationships(
  elements: readonly AriaListboxElement[],
): readonly AriaListboxRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const diagnostics: AriaListboxRelationshipDiagnostic[] = []
  const positions = new Map<AriaListboxElement, number>()
  iterate.forEach(elements, (element, elementIndex) => {
    if (!positions.has(element)) positions.set(element, elementIndex)
  })

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
    return iterate.some(index.resolveList(owns), (resolution) => {
      if (resolution.status !== 'resolved') return false
      const ownedIndex = positions.get(resolution.target) ?? -1
      // A listbox may own an option directly or own a group that contains
      // options. Treat descendants of an explicitly owned group as owned too.
      return ownedIndex === optionIndex || isDescendantOf(optionIndex, ownedIndex)
    })
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

    if (roleOf(element) === 'listbox') {
      const options = elements.filter(
        (candidate, candidateIndex) =>
          roleOf(candidate) === 'option' && isOwnedBy(candidateIndex, elementIndex),
      )
      if (
        options.some((option) => hasProp(option, 'aria-selected')) &&
        options.some((option) => hasProp(option, 'aria-checked'))
      ) {
        diagnostics.push({ elementIndex, issue: 'mixed-option-selection-state' })
      }

      const activeDescendant = element.props?.['aria-activedescendant']
      const references = isString(activeDescendant) ? index.resolveList(activeDescendant) : []

      iterate.forEach(references, (resolution) => {
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
          const targetIndex = positions.get(resolution.target) ?? -1
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
    }
  })

  return diagnostics
}
