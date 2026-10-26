import { createAriaReferenceIndex, isResolvedLookup } from './id-reference-index'
import { roleOf, warn } from './shared'
import type {
  AriaIdLookup,
  AriaIdLookupIndex,
  AriaReferenceElement,
  AriaRelationshipDiagnostic,
  AriaResolvedLookup,
} from './types'

export type AriaTabRelationshipDiagnostic = AriaRelationshipDiagnostic<
  'wrong-target-role' | 'missing-tab-reference' | 'mismatched-tab-reference',
  { readonly targetId: string }
>

function isTab(target: AriaResolvedLookup): boolean {
  return roleOf(target.element) === 'tab'
}

/** A uniquely resolved target whose role is not `tabpanel`. */
function isNotTabpanel(target: AriaIdLookup): target is AriaResolvedLookup {
  return isResolvedLookup(target) && roleOf(target.element) !== 'tabpanel'
}

/** A tab's uniquely resolved `aria-controls` targets must be tabpanels. */
function tabDiagnostics(
  element: AriaReferenceElement,
  sourceIndex: number,
  index: AriaIdLookupIndex,
): AriaTabRelationshipDiagnostic[] {
  return index
    .resolveList(element.props?.['aria-controls'])
    .filter(isNotTabpanel)
    .map((target) =>
      warn(
        'wrong-target-role',
        sourceIndex,
        `role="tab" controls id "${target.id}", but the target is not role="tabpanel".`,
        target.id,
      ),
    )
}

/** A tabpanel's uniquely resolved `aria-labelledby` targets should include a tab. */
function tabpanelDiagnostics(
  elements: readonly AriaReferenceElement[],
  element: AriaReferenceElement,
  sourceIndex: number,
  index: AriaIdLookupIndex,
): AriaTabRelationshipDiagnostic[] {
  const labels = index.resolveList(element.props?.['aria-labelledby']).filter(isResolvedLookup)
  const [first] = labels

  // Nothing resolved uniquely (don't guess).
  if (!first) return []

  const labelledTabs = labels.filter(isTab)
  const [labelledTab] = labelledTabs
  const controllingTabs = elements.flatMap((candidate) => {
    if (roleOf(candidate) !== 'tab') return []
    const controls = index.resolveList(candidate.props?.['aria-controls'])
    return controls.some((target) => isResolvedLookup(target) && target.element === element)
      ? [candidate]
      : []
  })

  // When both sides declare the relationship, they must identify the same tab. Do not
  // require reciprocal attributes: this only flags an explicit, uniquely resolved conflict.
  if (controllingTabs.length > 0 && labelledTab) {
    const matchingTab = controllingTabs.some((tab) =>
      labelledTabs.some((label) => label.element === tab),
    )
    if (!matchingTab) {
      return [
        warn(
          'mismatched-tab-reference',
          sourceIndex,
          `role="tabpanel" is controlled by a tab, but aria-labelledby references different tab id "${labelledTab.id}".`,
          labelledTab.id,
        ),
      ]
    }
  }

  if (labelledTab) return []

  return [
    warn(
      'missing-tab-reference',
      sourceIndex,
      'role="tabpanel" aria-labelledby should reference its controlling role="tab".',
      first.id,
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
    if (role === 'tabpanel') return tabpanelDiagnostics(elements, element, sourceIndex, index)
    return []
  })
}
