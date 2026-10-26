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
  | 'mixed-option-selection-state'

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
 * may additionally establish ownership. It also warns when a listbox mixes
 * `aria-selected` and `aria-checked` as option selection mechanisms. This is not
 * a DOM walker and does not validate selection values or keyboard interaction.
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
    return iterate.some(index.resolveList(owns), (resolution) => {
      if (resolution.status !== 'resolved') return false
      const ownedIndex = elements.indexOf(resolution.target)
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

    if (roleOf(element) !== 'listbox') return

    let usesAriaSelected = false
    let usesAriaChecked = false
    iterate.forEach(elements, (candidate, candidateIndex) => {
      if (roleOf(candidate) !== 'option' || !isOwnedBy(candidateIndex, elementIndex)) return
      const props = candidate.props
      if (!props) return
      usesAriaSelected ||= Object.prototype.hasOwnProperty.call(props, 'aria-selected')
      usesAriaChecked ||= Object.prototype.hasOwnProperty.call(props, 'aria-checked')
    })
    if (usesAriaSelected && usesAriaChecked) {
      diagnostics.push({ elementIndex, issue: 'mixed-option-selection-state' })
    }

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
