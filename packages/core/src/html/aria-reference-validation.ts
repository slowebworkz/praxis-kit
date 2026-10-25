import { isString } from '@praxis-kit/guards'
import { iterate } from '@praxis-kit/primitive'
import type { AriaIdReferenceResolution } from './aria-reference-index'
import { createAriaReferenceIndex } from './aria-reference-index'
import type { AnyRecord } from '@praxis-kit/primitive'

/** Element data needed for tree-level ID-reference integrity checks. */
export interface AriaReferenceElement {
  readonly id?: string | null
  readonly props?: Readonly<AnyRecord>
}

export type AriaReferenceAttribute = 'aria-labelledby' | 'aria-controls' | 'aria-activedescendant'

export interface AriaReferenceDiagnostic {
  /** Position of the source element in the caller-supplied element sequence. */
  readonly sourceIndex: number
  readonly attribute: AriaReferenceAttribute
  /** The individual ID token, not the full whitespace-separated attribute value. */
  readonly reference: string
  readonly resolution: Exclude<
    AriaIdReferenceResolution<AriaReferenceElement>,
    { status: 'resolved' }
  >
}

const REFERENCE_ATTRIBUTES: readonly AriaReferenceAttribute[] = [
  'aria-labelledby',
  'aria-controls',
  'aria-activedescendant',
]

/**
 * Checks ID-reference integrity for a caller-supplied element scope.
 *
 * Only string-valued reference attributes are inspected. This intentionally does
 * not validate target roles, ancestry, ownership, or whether a reference is
 * appropriate for a particular widget pattern.
 */
export function validateAriaIdReferences(
  elements: readonly AriaReferenceElement[],
): readonly AriaReferenceDiagnostic[] {
  const index = createAriaReferenceIndex(elements)
  const diagnostics: AriaReferenceDiagnostic[] = []

  iterate.forEach(elements, (source, sourceIndex) => {
    iterate.forEach(REFERENCE_ATTRIBUTES, (attribute) => {
      const value = source.props?.[attribute]
      if (!isString(value)) return

      iterate.forEach(index.resolveList(value), (resolution) => {
        if (resolution.status === 'resolved') return
        diagnostics.push({
          sourceIndex,
          attribute,
          reference: resolution.id,
          resolution,
        })
      })
    })
  })

  return diagnostics
}
