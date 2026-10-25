import { createAriaReferenceIndex, isUnresolvedLookup } from './id-reference-index'
import type { AriaReferenceElement } from './id-reference-index'

const COMBOBOX_POPUP_ROLES = new Set(['listbox', 'tree', 'grid', 'dialog'])

export interface AriaComboboxRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code: 'missing-target' | 'ambiguous-target' | 'wrong-popup-role'
  readonly sourceIndex: number
  readonly targetId: string
  readonly message: string
}

function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

function warn(
  code: AriaComboboxRelationshipDiagnostic['code'],
  sourceIndex: number,
  targetId: string,
  message: string,
): AriaComboboxRelationshipDiagnostic {
  return { valid: false, severity: 'warning', code, sourceIndex, targetId, message }
}

/**
 * Validates `aria-controls` popup references for comboboxes within a caller-supplied
 * element scope. `aria-controls` is optional here; when supplied, unresolved IDs are
 * reported and uniquely resolved targets must use a supported popup role. This does
 * not infer DOM containment, focus strategy, or keyboard behavior.
 */
export function validateAriaComboboxRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaComboboxRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)

  return elements.flatMap((element, sourceIndex) => {
    if (roleOf(element) !== 'combobox') return []

    return index
      .resolveList(element.props?.['aria-controls'])
      .flatMap((target): AriaComboboxRelationshipDiagnostic[] => {
        if (isUnresolvedLookup(target)) {
          return target.status === 'missing'
            ? [
                warn(
                  'missing-target',
                  sourceIndex,
                  target.id,
                  `role="combobox" aria-controls references missing id "${target.id}".`,
                ),
              ]
            : [
                warn(
                  'ambiguous-target',
                  sourceIndex,
                  target.id,
                  `role="combobox" aria-controls references id "${target.id}", which is not unique.`,
                ),
              ]
        }

        if (COMBOBOX_POPUP_ROLES.has(String(roleOf(target.element)))) return []

        return [
          warn(
            'wrong-popup-role',
            sourceIndex,
            target.id,
            `role="combobox" controls id "${target.id}", but the target role must be listbox, tree, grid, or dialog.`,
          ),
        ]
      })
  })
}
