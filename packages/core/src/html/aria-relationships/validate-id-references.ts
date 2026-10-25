import { createAriaReferenceIndex, isUnresolvedLookup } from './id-reference-index'
import type {
  AriaReferenceElement,
  AriaReferenceIndex,
  AriaUnresolvedLookup,
} from './id-reference-index'

export type AriaReferenceAttribute = 'aria-labelledby' | 'aria-controls' | 'aria-activedescendant'

export interface AriaRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code: 'missing-target' | 'ambiguous-target'
  readonly attribute: AriaReferenceAttribute
  readonly sourceIndex: number
  readonly targetId: string
  readonly message: string
}

const REFERENCE_ATTRIBUTES: readonly AriaReferenceAttribute[] = [
  'aria-labelledby',
  'aria-controls',
  'aria-activedescendant',
]

function toDiagnostic(
  attribute: AriaReferenceAttribute,
  sourceIndex: number,
  target: AriaUnresolvedLookup,
): AriaRelationshipDiagnostic {
  const missing = target.status === 'missing'

  return {
    valid: false,
    severity: 'warning',
    code: missing ? 'missing-target' : 'ambiguous-target',
    attribute,
    sourceIndex,
    targetId: target.id,
    message: missing
      ? `${attribute} references missing id "${target.id}".`
      : `${attribute} references id "${target.id}", which is not unique.`,
  }
}

/** Every missing or ambiguous token across one element's reference attributes. */
function unresolvedReferences(
  element: AriaReferenceElement,
  sourceIndex: number,
  index: AriaReferenceIndex,
): AriaRelationshipDiagnostic[] {
  return REFERENCE_ATTRIBUTES.flatMap((attribute) =>
    index
      .resolveList(element.props?.[attribute])
      .filter(isUnresolvedLookup)
      .map((target) => toDiagnostic(attribute, sourceIndex, target)),
  )
}

/** Checks ID-reference integrity only; target roles and widget relationships are handled separately. */
export function validateAriaIdReferences(
  elements: readonly AriaReferenceElement[],
): readonly AriaRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)

  return elements.flatMap((element, sourceIndex) =>
    unresolvedReferences(element, sourceIndex, index),
  )
}
