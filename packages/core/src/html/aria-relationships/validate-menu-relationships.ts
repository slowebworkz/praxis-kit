import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex } from './id-reference-index'
import { buildOwnershipGraph } from './ownership-graph'
import { hasRole, MENU_ITEM_ROLES, MENU_OWNER_ROLES, warn } from './shared'
import type { AriaReferenceElement, AriaRelationshipDiagnostic } from './types'

export type AriaMenuRelationshipDiagnostic = AriaRelationshipDiagnostic<
  'menuitem-without-menu-owner' | 'menuitem-with-multiple-menu-owners'
>

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
  const graph = buildOwnershipGraph(elements, index, () => true)

  const diagnostics: AriaMenuRelationshipDiagnostic[] = []
  iterate.forEach(elements, (element, sourceIndex) => {
    if (hasRole(element, MENU_ITEM_ROLES)) {
      // A nested menu is the owning composite; don't also count an outer menubar.
      const owners = graph.nearestOwnersOf(sourceIndex, (ownerIndex) =>
        hasRole(elements[ownerIndex]!, MENU_OWNER_ROLES),
      )

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
    }
  })

  return diagnostics
}
