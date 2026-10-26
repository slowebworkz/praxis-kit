import { createAriaReferenceIndex, isUnresolvedLookup } from './id-reference-index'
import { REFERENCE_ATTRIBUTES, unresolvedReference, warn } from './shared'
import type {
  AriaIdLookupIndex,
  AriaReferenceAttribute,
  AriaReferenceElement,
  AriaRelationshipDiagnostic,
  AriaUnresolvedLookup,
  UnresolvedReferenceCode,
} from './types'

export type AriaIdReferenceDiagnostic = AriaRelationshipDiagnostic<
  UnresolvedReferenceCode,
  { readonly attribute: AriaReferenceAttribute; readonly targetId: string }
>

function toDiagnostic(
  attribute: AriaReferenceAttribute,
  sourceIndex: number,
  target: AriaUnresolvedLookup,
): AriaIdReferenceDiagnostic {
  const { code, message } = unresolvedReference(target, attribute)
  return { ...warn(code, sourceIndex, message, target.id), attribute }
}

/** Every missing or ambiguous token across one element's reference attributes. */
function unresolvedReferences(
  element: AriaReferenceElement,
  sourceIndex: number,
  index: AriaIdLookupIndex,
): AriaIdReferenceDiagnostic[] {
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
): readonly AriaIdReferenceDiagnostic[] {
  const index = createAriaReferenceIndex(elements)

  return elements.flatMap((element, sourceIndex) =>
    unresolvedReferences(element, sourceIndex, index),
  )
}
