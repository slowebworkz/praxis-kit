import { isDefined } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex } from './id-reference-index'
import { buildOwnershipGraph, misownedActiveDescendant } from './ownership-graph'
import {
  TREE_ITEM_CHILD_ROLES,
  TREE_OWNER_ROLES,
  TREEITEM_ROLES,
  hasProp,
  hasRole,
  idOf,
  roleOf,
  warn,
} from './shared'
import type { AriaReferenceElement, AriaRelationshipDiagnostic } from './types'

export type AriaTreeRelationshipDiagnostic = AriaRelationshipDiagnostic<
  | 'missing-owner'
  | 'wrong-owner-role'
  | 'multiple-owners'
  | 'missing-group-owner'
  | 'wrong-group-owner-role'
  | 'multiple-group-owners'
  | 'active-descendant-not-owned'
  | 'missing-expanded'
  | 'expanded-on-leaf'
  | 'mixed-treeitem-selection-state',
  { readonly targetId?: string }
>

/**
 * Validates tree/treeitem ownership against a complete caller-supplied scope.
 * `parentId` describes structural containment; `aria-owns` adds explicit ownership edges.
 * This checks relationships only, not keyboard interaction or focus movement.
 */
export function validateAriaTreeRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaTreeRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const graph = buildOwnershipGraph(elements, index, (element) =>
    hasRole(element, TREE_OWNER_ROLES),
  )
  const parents = graph.parents
  const children = graph.children
  // A nested tree establishes its own selection scope; items behind it belong to the nested tree.
  const isTree = (elementIndex: number) => roleOf(elements[elementIndex]!) === 'tree'

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
          (ownerIndex) => !hasRole(elements[ownerIndex]!, TREE_OWNER_ROLES),
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
        hasRole(elements[childIndex]!, TREE_ITEM_CHILD_ROLES),
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
      const items = elements.filter(
        (candidate, candidateIndex) =>
          roleOf(candidate) === 'treeitem' && graph.belongsTo(candidateIndex, sourceIndex, isTree),
      )
      if (
        items.some((item) => hasProp(item, 'aria-selected')) &&
        items.some((item) => hasProp(item, 'aria-checked'))
      ) {
        diagnostics.push(
          warn(
            'mixed-treeitem-selection-state',
            sourceIndex,
            'Treeitems owned by the same tree should use a consistent selection state mechanism: aria-selected or aria-checked, not both.',
          ),
        )
      }
    }

    if (role === 'tree') {
      const misowned = misownedActiveDescendant(graph, index, element, sourceIndex, TREEITEM_ROLES)
      if (misowned) {
        diagnostics.push(
          warn(
            'active-descendant-not-owned',
            sourceIndex,
            'aria-activedescendant must reference a treeitem owned by this tree.',
            misowned.id,
          ),
        )
      }
    }
  })

  return diagnostics
}
