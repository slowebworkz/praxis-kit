import { createAriaReferenceIndex, isUnresolvedLookup } from './id-reference-index'
import { COMBOBOX_POPUP_ROLES, hasRole, roleOf, unresolvedReference, warn } from './shared'
import type {
  AriaReferenceElement,
  AriaRelationshipDiagnostic,
  UnresolvedReferenceCode,
} from './types'

export type AriaComboboxRelationshipDiagnostic = AriaRelationshipDiagnostic<
  UnresolvedReferenceCode | 'wrong-popup-role',
  { readonly targetId: string }
>

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
          const { code, message } = unresolvedReference(target, 'role="combobox" aria-controls')
          return [warn(code, sourceIndex, message, target.id)]
        }

        if (hasRole(target.element, COMBOBOX_POPUP_ROLES)) return []

        return [
          warn(
            'wrong-popup-role',
            sourceIndex,
            `role="combobox" controls id "${target.id}", but the target role must be listbox, tree, grid, or dialog.`,
            target.id,
          ),
        ]
      })
  })
}
