import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { AriaRole } from '../../types'

// A set of attributes required per ARIA role, plus how to diagnose a missing one.
// Powers both #checkRequiredAriaProperties (e.g. combobox requires aria-expanded) and
// #checkMissingAtomic (live-region roles require aria-atomic) — each supplies its own
// attributesByRole table and diagnosticFor callback (their diagnostic factories have different
// signatures: requiredProperty(attribute, role) vs missingAtomic(role)).
export interface RoleAttributeRequirements {
  readonly attributesByRole: Readonly<Partial<Record<AriaRole, readonly string[]>>>
  readonly diagnosticFor: (attribute: string, role: AriaRole) => DiagnosticInput
}
