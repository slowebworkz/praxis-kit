import { iterate } from '@praxis-kit/primitive'
import { createAriaReferenceIndex } from './id-reference-index'
import { buildOwnershipGraph } from './ownership-graph'
import { roleOf, warn } from './shared'
import type { AriaReferenceElement, AriaRelationshipDiagnostic } from './types'

export type AriaRadiogroupRelationshipDiagnostic = AriaRelationshipDiagnostic<
  'radio-without-radiogroup-owner' | 'radio-with-multiple-radiogroup-owners'
>

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
  const graph = buildOwnershipGraph(elements, index, (element) => roleOf(element) === 'radiogroup')

  const diagnostics: AriaRadiogroupRelationshipDiagnostic[] = []
  iterate.forEach(elements, (element, sourceIndex) => {
    if (roleOf(element) === 'radio') {
      const owners = [...graph.ancestorsOf(sourceIndex)].filter(
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
    }
  })

  return diagnostics
}
