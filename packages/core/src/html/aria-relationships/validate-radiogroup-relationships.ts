import { isDefined, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex, isResolvedLookup } from './id-reference-index'
import type { AriaReferenceElement } from './id-reference-index'

export interface AriaRadiogroupRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code: 'radio-without-radiogroup-owner' | 'radio-with-multiple-radiogroup-owners'
  readonly sourceIndex: number
  readonly message: string
}

function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

function warn(
  code: AriaRadiogroupRelationshipDiagnostic['code'],
  sourceIndex: number,
  message: string,
): AriaRadiogroupRelationshipDiagnostic {
  return { valid: false, severity: 'warning', code, sourceIndex, message }
}

/**
 * Validates radio-to-radiogroup membership within a caller-supplied scope.
 * `parentId` describes structural containment and `aria-owns` describes explicit
 * ownership. This does not validate checked-state exclusivity, labeling, or keyboard
 * interaction; those require different or runtime context.
 */
export function validateAriaRadiogroupRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaRadiogroupRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const elementIndexes = new Map<AriaReferenceElement, number>()
  iterate.forEach(elements, (element, elementIndex) => elementIndexes.set(element, elementIndex))

  const parents = elements.map(() => new Set<number>())
  const addEdge = (parentIndex: number, childIndex: number) => {
    parents[childIndex]!.add(parentIndex)
  }

  iterate.forEach(elements, (element, childIndex) => {
    if (isString(element.parentId)) {
      const parent = index.lookup(element.parentId)
      if (isResolvedLookup(parent)) {
        const parentIndex = elementIndexes.get(parent.element)
        if (isDefined(parentIndex)) addEdge(parentIndex, childIndex)
      }
    }

    if (roleOf(element) === 'radiogroup') {
      for (const target of index.resolveList(element.props?.['aria-owns'])) {
        if (!isResolvedLookup(target)) continue
        const targetIndex = elementIndexes.get(target.element)
        if (isDefined(targetIndex)) addEdge(childIndex, targetIndex)
      }
    }
  })

  const ancestorsOf = (sourceIndex: number): Set<number> => {
    const ancestors = new Set<number>()
    const pending = [...parents[sourceIndex]!]
    while (pending.length > 0) {
      const current = pending.pop()!
      if (ancestors.has(current)) continue
      ancestors.add(current)
      pending.push(...parents[current]!)
    }
    return ancestors
  }

  const diagnostics: AriaRadiogroupRelationshipDiagnostic[] = []
  iterate.forEach(elements, (element, sourceIndex) => {
    if (roleOf(element) !== 'radio') return

    const owners = [...ancestorsOf(sourceIndex)].filter(
      (ancestorIndex) => roleOf(elements[ancestorIndex]!) === 'radiogroup',
    )

    if (owners.length === 0) {
      diagnostics.push(
        warn(
          'radio-without-radiogroup-owner',
          sourceIndex,
          'role="radio" is not contained in or explicitly owned by a radiogroup.',
        ),
      )
    } else if (owners.length > 1) {
      diagnostics.push(
        warn(
          'radio-with-multiple-radiogroup-owners',
          sourceIndex,
          'role="radio" is associated with more than one radiogroup.',
        ),
      )
    }
  })

  return diagnostics
}
