import { isDefined, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex, isResolvedLookup } from './id-reference-index'
import type { AriaReferenceElement } from './id-reference-index'

export interface AriaGridRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code: 'row-without-grid-owner' | 'cell-without-row-owner' | 'active-descendant-not-owned'
  readonly sourceIndex: number
  readonly targetId?: string
  readonly message: string
}

function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

function warn(
  code: AriaGridRelationshipDiagnostic['code'],
  sourceIndex: number,
  message: string,
  targetId?: string,
): AriaGridRelationshipDiagnostic {
  return {
    valid: false,
    severity: 'warning',
    code,
    sourceIndex,
    ...(targetId ? { targetId } : {}),
    message,
  }
}

/**
 * Validates grid/treegrid row and cell ownership within a caller-supplied scope.
 * `parentId` represents structural containment and `aria-owns` explicit ownership.
 * Optional counts, indices, selection state, and keyboard behavior are deliberately
 * outside this relationship check.
 */
export function validateAriaGridRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaGridRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const elementIndexes = new Map<AriaReferenceElement, number>()
  iterate.forEach(elements, (element, elementIndex) => {
    elementIndexes.set(element, elementIndex)
  })
  const parents = elements.map(() => new Set<number>())
  const children = elements.map(() => new Set<number>())

  const addEdge = (parentIndex: number, childIndex: number) => {
    parents[childIndex]!.add(parentIndex)
    children[parentIndex]!.add(childIndex)
  }

  iterate.forEach(elements, (element, childIndex) => {
    if (isString(element.parentId)) {
      const parent = index.lookup(element.parentId)
      if (isResolvedLookup(parent)) {
        const parentIndex = elementIndexes.get(parent.element)
        if (isDefined(parentIndex)) addEdge(parentIndex, childIndex)
      }
    }
    const role = roleOf(element)
    if (['grid', 'treegrid', 'rowgroup', 'row'].includes(String(role))) {
      const owned = index.resolveList(element.props?.['aria-owns']).filter(isResolvedLookup)
      iterate.forEach(owned, (target) => {
        const targetIndex = elementIndexes.get(target.element)
        if (isDefined(targetIndex)) addEdge(childIndex, targetIndex)
      })
    }
  })

  const ancestorsOf = (sourceIndex: number): Set<number> => {
    const ancestors = new Set<number>()
    const pending = [...parents[sourceIndex]!]
    while (pending.length) {
      const current = pending.pop()!
      if (ancestors.has(current)) continue
      ancestors.add(current)
      pending.push(...parents[current]!)
    }
    return ancestors
  }

  const diagnostics: AriaGridRelationshipDiagnostic[] = []
  iterate.forEach(elements, (element, sourceIndex) => {
    const role = roleOf(element)
    const ancestors = ancestorsOf(sourceIndex)

    if (role === 'row') {
      const hasGridOwner = [...ancestors].some((ancestorIndex) =>
        ['grid', 'treegrid'].includes(String(roleOf(elements[ancestorIndex]!))),
      )
      if (!hasGridOwner) {
        diagnostics.push(
          warn(
            'row-without-grid-owner',
            sourceIndex,
            'role="row" is not contained in or owned by a grid or treegrid.',
          ),
        )
      }
    }

    if (['gridcell', 'rowheader', 'columnheader'].includes(String(role))) {
      const hasRowOwner = [...parents[sourceIndex]!].some(
        (parentIndex) => roleOf(elements[parentIndex]!) === 'row',
      )
      if (!hasRowOwner) {
        diagnostics.push(
          warn(
            'cell-without-row-owner',
            sourceIndex,
            `role="${String(role)}" is not contained in or owned by a row.`,
          ),
        )
      }
    }

    const activeDescendant = element.props?.['aria-activedescendant']
    if ((role === 'grid' || role === 'treegrid') && isString(activeDescendant)) {
      const active = index.resolveList(activeDescendant)[0]
      if (active && isResolvedLookup(active)) {
        const targetIndex = elementIndexes.get(active.element)
        if (isDefined(targetIndex)) {
          const targetRole = roleOf(active.element)
          const validTargetRole = ['gridcell', 'rowheader', 'columnheader'].includes(
            String(targetRole),
          )
          if (!validTargetRole || !ancestorsOf(targetIndex).has(sourceIndex)) {
            diagnostics.push(
              warn(
                'active-descendant-not-owned',
                sourceIndex,
                'aria-activedescendant must reference a grid cell owned by this grid or treegrid.',
                active.id,
              ),
            )
          }
        }
      }
    }
  })

  return diagnostics
}
