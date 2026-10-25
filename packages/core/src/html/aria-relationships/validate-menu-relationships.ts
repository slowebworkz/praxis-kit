import { isDefined, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex, isResolvedLookup } from './id-reference-index'
import type { AriaReferenceElement } from './id-reference-index'

export interface AriaMenuRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code: 'menuitem-without-menu-owner' | 'menuitem-with-multiple-menu-owners'
  readonly sourceIndex: number
  readonly message: string
}

function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

function warn(
  code: AriaMenuRelationshipDiagnostic['code'],
  sourceIndex: number,
  message: string,
): AriaMenuRelationshipDiagnostic {
  return { valid: false, severity: 'warning', code, sourceIndex, message }
}

/**
 * Validates menuitem ownership within a caller-supplied document scope.
 * `parentId` describes structural containment and `aria-owns` adds explicit ownership.
 * Group wrappers are allowed between a menuitem and its menu/menubar. This does not
 * validate submenu state, accessible names, keyboard interaction, or focus movement.
 */
export function validateAriaMenuRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaMenuRelationshipDiagnostic[] {
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

    const owned = index.resolveList(element.props?.['aria-owns']).filter(isResolvedLookup)
    iterate.forEach(owned, (target) => {
      const targetIndex = elementIndexes.get(target.element)
      if (isDefined(targetIndex)) addEdge(childIndex, targetIndex)
    })
  })

  const menuOwnersOf = (sourceIndex: number): Set<number> => {
    const owners = new Set<number>()
    const pending = [...parents[sourceIndex]!]
    const visited = new Set<number>()

    while (pending.length > 0) {
      const ancestorIndex = pending.pop()!
      if (visited.has(ancestorIndex)) continue
      visited.add(ancestorIndex)

      const role = roleOf(elements[ancestorIndex]!)
      if (role === 'menu' || role === 'menubar') {
        owners.add(ancestorIndex)
        // A nested menu is the owning composite; don't also count an outer menubar.
        continue
      }

      pending.push(...parents[ancestorIndex]!)
    }

    return owners
  }

  const diagnostics: AriaMenuRelationshipDiagnostic[] = []
  iterate.forEach(elements, (element, sourceIndex) => {
    if (!['menuitem', 'menuitemcheckbox', 'menuitemradio'].includes(String(roleOf(element)))) {
      return
    }

    const owners = menuOwnersOf(sourceIndex)
    if (owners.size === 0) {
      diagnostics.push(
        warn(
          'menuitem-without-menu-owner',
          sourceIndex,
          'Menu item roles must be contained in or explicitly owned by a menu or menubar.',
        ),
      )
    } else if (owners.size > 1) {
      diagnostics.push(
        warn(
          'menuitem-with-multiple-menu-owners',
          sourceIndex,
          'Menu item roles are associated with more than one menu or menubar.',
        ),
      )
    }
  })

  return diagnostics
}
