import { isDefined, isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex, isResolvedLookup } from './id-reference-index'
import type { AriaReferenceElement } from './id-reference-index'

export interface AriaTreeRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code:
    | 'missing-owner'
    | 'wrong-owner-role'
    | 'multiple-owners'
    | 'missing-group-owner'
    | 'wrong-group-owner-role'
    | 'multiple-group-owners'
    | 'active-descendant-not-owned'
    | 'missing-expanded'
    | 'expanded-on-leaf'
    | 'mixed-treeitem-selection-state'
  readonly sourceIndex: number
  readonly targetId?: string
  readonly message: string
}

function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

function idOf(element: AriaReferenceElement): string | undefined {
  const id = element.id ?? element.props?.id
  return isString(id) && id.length > 0 ? id : undefined
}

function hasProp(element: AriaReferenceElement, name: string): boolean {
  return isDefined(element.props) && Object.hasOwn(element.props, name)
}

function warn(
  code: AriaTreeRelationshipDiagnostic['code'],
  sourceIndex: number,
  message: string,
  targetId?: string,
): AriaTreeRelationshipDiagnostic {
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
 * Validates tree/treeitem ownership against a complete caller-supplied scope.
 * `parentId` describes structural containment; `aria-owns` adds explicit ownership edges.
 * This checks relationships only, not keyboard interaction or focus movement.
 */
export function validateAriaTreeRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaTreeRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const ids = new Map<AriaReferenceElement, number>()
  iterate.forEach(elements, (element, elementIndex) => {
    ids.set(element, elementIndex)
  })

  // Build ownership edges from structural parent IDs and explicit aria-owns references.
  const children = elements.map(() => new Set<number>())
  const parents = elements.map(() => new Set<number>())
  const addEdge = (parentIndex: number, childIndex: number) => {
    children[parentIndex]!.add(childIndex)
    parents[childIndex]!.add(parentIndex)
  }

  iterate.forEach(elements, (element, childIndex) => {
    if (isString(element.parentId)) {
      const parent = index.lookup(element.parentId)
      if (isResolvedLookup(parent)) {
        const parentIndex = ids.get(parent.element)
        if (isDefined(parentIndex)) addEdge(parentIndex, childIndex)
      }
    }

    if (['tree', 'treeitem', 'group'].includes(String(roleOf(element)))) {
      const owned = index.resolveList(element.props?.['aria-owns']).filter(isResolvedLookup)
      iterate.forEach(owned, (target) => {
        const targetIndex = ids.get(target.element)
        if (isDefined(targetIndex)) addEdge(childIndex, targetIndex)
      })
    }
  })

  const descendantsOf = (rootIndex: number): Set<number> => {
    const descendants = new Set<number>()
    const pending = [...children[rootIndex]!]
    while (pending.length > 0) {
      const next = pending.pop()!
      if (descendants.has(next)) continue
      descendants.add(next)
      pending.push(...children[next]!)
    }
    return descendants
  }

  const belongsToTree = (itemIndex: number, treeIndex: number): boolean => {
    const pending = [...parents[itemIndex]!]
    const visited = new Set<number>()
    while (pending.length > 0) {
      const parentIndex = pending.pop()!
      if (parentIndex === treeIndex) return true
      if (visited.has(parentIndex)) continue
      visited.add(parentIndex)
      // A nested tree establishes its own selection scope. Do not attribute its
      // treeitems to an outer tree through the nested tree boundary.
      if (roleOf(elements[parentIndex]!) === 'tree') continue
      pending.push(...parents[parentIndex]!)
    }
    return false
  }

  const diagnostics: AriaTreeRelationshipDiagnostic[] = []

  iterate.forEach(elements, (element, sourceIndex) => {
    const role = roleOf(element)

    if (role === 'group') {
      const ownerIndexes = [...parents[sourceIndex]!]
      if (ownerIndexes.length === 0) {
        diagnostics.push(
          warn(
            'missing-group-owner',
            sourceIndex,
            'role="group" in a tree must be owned by a treeitem.',
          ),
        )
      } else {
        const invalidOwner = ownerIndexes.find(
          (ownerIndex) => roleOf(elements[ownerIndex]!) !== 'treeitem',
        )
        if (isDefined(invalidOwner)) {
          diagnostics.push(
            warn(
              'wrong-group-owner-role',
              sourceIndex,
              'role="group" in a tree must be owned by a treeitem, not another role.',
              idOf(elements[invalidOwner]!),
            ),
          )
        }
        if (ownerIndexes.length > 1) {
          diagnostics.push(
            warn(
              'multiple-group-owners',
              sourceIndex,
              'role="group" has more than one resolved owner.',
            ),
          )
        }
      }
    }

    if (role === 'treeitem') {
      const ownerIndexes = [...parents[sourceIndex]!]
      if (ownerIndexes.length === 0) {
        diagnostics.push(
          warn(
            'missing-owner',
            sourceIndex,
            'role="treeitem" is not owned by a tree, treeitem, or group.',
          ),
        )
      } else {
        const invalidOwner = ownerIndexes.find(
          (ownerIndex) =>
            !['tree', 'treeitem', 'group'].includes(String(roleOf(elements[ownerIndex]!))),
        )
        if (isDefined(invalidOwner)) {
          diagnostics.push(
            warn(
              'wrong-owner-role',
              sourceIndex,
              'role="treeitem" has an owner whose role is not tree, treeitem, or group.',
              idOf(elements[invalidOwner]!),
            ),
          )
        }
        if (ownerIndexes.length > 1) {
          diagnostics.push(
            warn(
              'multiple-owners',
              sourceIndex,
              'role="treeitem" has more than one resolved owner.',
            ),
          )
        }
      }

      const hasChildren = [...children[sourceIndex]!].some((childIndex) =>
        ['treeitem', 'group'].includes(String(roleOf(elements[childIndex]!))),
      )
      if (hasChildren && !hasProp(element, 'aria-expanded')) {
        diagnostics.push(
          warn(
            'missing-expanded',
            sourceIndex,
            'Expandable role="treeitem" should expose aria-expanded.',
          ),
        )
      } else if (!hasChildren && hasProp(element, 'aria-expanded')) {
        diagnostics.push(
          warn(
            'expanded-on-leaf',
            sourceIndex,
            'Leaf role="treeitem" should not expose aria-expanded.',
          ),
        )
      }
    }

    if (role === 'tree') {
      let usesAriaSelected = false
      let usesAriaChecked = false
      iterate.forEach(elements, (candidate, candidateIndex) => {
        if (roleOf(candidate) !== 'treeitem' || !belongsToTree(candidateIndex, sourceIndex)) return
        usesAriaSelected ||= hasProp(candidate, 'aria-selected')
        usesAriaChecked ||= hasProp(candidate, 'aria-checked')
      })
      if (usesAriaSelected && usesAriaChecked) {
        diagnostics.push(
          warn(
            'mixed-treeitem-selection-state',
            sourceIndex,
            'Treeitems owned by the same tree should use a consistent selection state mechanism: aria-selected or aria-checked, not both.',
          ),
        )
      }
    }

    if (role === 'tree' && hasProp(element, 'aria-activedescendant')) {
      const active = index.resolveList(element.props?.['aria-activedescendant'])[0]
      if (active && isResolvedLookup(active)) {
        const targetIndex = ids.get(active.element)
        if (
          isDefined(targetIndex) &&
          (roleOf(active.element) !== 'treeitem' || !descendantsOf(sourceIndex).has(targetIndex))
        ) {
          diagnostics.push(
            warn(
              'active-descendant-not-owned',
              sourceIndex,
              'aria-activedescendant must reference a treeitem owned by this tree.',
              active.id,
            ),
          )
        }
      }
    }
  })

  return diagnostics
}
