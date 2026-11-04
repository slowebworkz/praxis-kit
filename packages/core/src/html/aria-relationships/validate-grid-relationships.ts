import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex } from './id-reference-index'
import { buildOwnershipGraph, misownedActiveDescendant } from './ownership-graph'
import { GRID_ARIA_OWNS_ROLES, GRID_CELL_ROLES, GRID_ROLES, hasRole, roleOf, warn } from './shared'
import type { AriaReferenceElement, AriaRelationshipDiagnostic } from './types'

export type AriaGridRelationshipDiagnostic = AriaRelationshipDiagnostic<
  | 'rowgroup-without-grid-owner'
  | 'rowgroup-with-multiple-grid-owners'
  | 'row-without-grid-owner'
  | 'cell-without-row-owner'
  | 'active-descendant-not-owned',
  { readonly targetId?: string }
>

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
  const graph = buildOwnershipGraph(elements, index, (element) =>
    hasRole(element, GRID_ARIA_OWNS_ROLES),
  )
  const isGrid = (elementIndex: number) => hasRole(elements[elementIndex]!, GRID_ROLES)

  const diagnostics: AriaGridRelationshipDiagnostic[] = []
  iterate.forEach(elements, (element, sourceIndex) => {
    const role = roleOf(element)

    if (role === 'rowgroup') {
      // A nested grid/treegrid is the owning composite; don't also count outer grids.
      const gridOwners = [...graph.nearestOwnersOf(sourceIndex, isGrid)]
      if (gridOwners.length === 0) {
        diagnostics.push(
          warn(
            'rowgroup-without-grid-owner',
            sourceIndex,
            'role="rowgroup" is not contained in or owned by a grid or treegrid.',
          ),
        )
      } else if (gridOwners.length > 1) {
        diagnostics.push(
          warn(
            'rowgroup-with-multiple-grid-owners',
            sourceIndex,
            'role="rowgroup" is associated with more than one grid or treegrid.',
          ),
        )
      }
    }

    if (role === 'row' && ![...graph.ancestorsOf(sourceIndex)].some(isGrid)) {
      diagnostics.push(
        warn(
          'row-without-grid-owner',
          sourceIndex,
          'role="row" is not contained in or owned by a grid or treegrid.',
        ),
      )
    }

    if (hasRole(element, GRID_CELL_ROLES)) {
      const hasRowOwner = [...graph.parents[sourceIndex]!].some(
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

    if (hasRole(element, GRID_ROLES)) {
      const misowned = misownedActiveDescendant(graph, index, element, sourceIndex, GRID_CELL_ROLES)
      if (misowned) {
        diagnostics.push(
          warn(
            'active-descendant-not-owned',
            sourceIndex,
            'aria-activedescendant must reference a grid cell owned by this grid or treegrid.',
            misowned.id,
          ),
        )
      }
    }
  })

  return diagnostics
}
