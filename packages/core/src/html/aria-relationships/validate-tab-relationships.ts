import { createAriaReferenceIndex, isResolvedLookup } from './id-reference-index'
import type {
  AriaIdLookup,
  AriaReferenceElement,
  AriaReferenceIndex,
  AriaResolvedLookup,
} from './id-reference-index'

export interface AriaTabRelationshipDiagnostic {
  readonly valid: false
  readonly severity: 'warning'
  readonly code: 'wrong-target-role' | 'missing-tab-reference'
  readonly sourceIndex: number
  readonly targetId: string
  readonly message: string
}

function roleOf(element: AriaReferenceElement): unknown {
  return element.role ?? element.props?.role
}

function isTab(target: AriaResolvedLookup): boolean {
  return roleOf(target.element) === 'tab'
}

/** A uniquely resolved target whose role is not `tabpanel`. */
function isNotTabpanel(target: AriaIdLookup): target is AriaResolvedLookup {
  return isResolvedLookup(target) && roleOf(target.element) !== 'tabpanel'
}

function warn(
  code: AriaTabRelationshipDiagnostic['code'],
  sourceIndex: number,
  targetId: string,
  message: string,
): AriaTabRelationshipDiagnostic {
  return { valid: false, severity: 'warning', code, sourceIndex, targetId, message }
}

/** A tab's uniquely resolved `aria-controls` targets must be tabpanels. */
function tabDiagnostics(
  element: AriaReferenceElement,
  sourceIndex: number,
  index: AriaReferenceIndex,
): AriaTabRelationshipDiagnostic[] {
  return index
    .resolveList(element.props?.['aria-controls'])
    .filter(isNotTabpanel)
    .map((target) =>
      warn(
        'wrong-target-role',
        sourceIndex,
        target.id,
        `role="tab" controls id "${target.id}", but the target is not role="tabpanel".`,
      ),
    )
}

/** A tabpanel's uniquely resolved `aria-labelledby` targets should include a tab. */
function tabpanelDiagnostics(
  element: AriaReferenceElement,
  sourceIndex: number,
  index: AriaReferenceIndex,
): AriaTabRelationshipDiagnostic[] {
  const labels = index.resolveList(element.props?.['aria-labelledby']).filter(isResolvedLookup)
  const [first] = labels

  // Nothing resolved uniquely (don't guess), or a tab is already referenced.
  if (!first || labels.some(isTab)) return []

  return [
    warn(
      'missing-tab-reference',
      sourceIndex,
      first.id,
      'role="tabpanel" aria-labelledby should reference its controlling role="tab".',
    ),
  ]
}

/** Validates role pairing for tabs and tabpanels when their ID references resolve uniquely. */
export function validateAriaTabRelationships(
  elements: readonly AriaReferenceElement[],
): readonly AriaTabRelationshipDiagnostic[] {
  const index = createAriaReferenceIndex(elements)

  return elements.flatMap((element, sourceIndex) => {
    const role = roleOf(element)
    if (role === 'tab') return tabDiagnostics(element, sourceIndex, index)
    if (role === 'tabpanel') return tabpanelDiagnostics(element, sourceIndex, index)
    return []
  })
}
