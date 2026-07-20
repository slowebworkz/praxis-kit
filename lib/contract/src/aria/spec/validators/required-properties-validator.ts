import type { AriaContext, AriaResult, AriaRole } from '../../../types'
import type { RoleAttributeRequirements } from '../types'

const NO_VIOLATIONS = [{ valid: true }] as const

// Derives a `RoleAttributeRequirements.attributesByRole` table from a role set that all require
// the same single attribute (e.g. every live-region role requires `aria-atomic`), so the table
// stays derived from — and can't drift out of sync with — its source role set.
export function requiredAttributeByRole(
  roles: Iterable<AriaRole>,
  attribute: string,
): Readonly<Partial<Record<AriaRole, readonly string[]>>> {
  return Object.fromEntries([...roles].map((role) => [role, [attribute]]))
}

/**
 * Reports missing attributes required by an element's effective ARIA role.
 *
 * Shared by validators that differ only in their role-to-attribute mapping and diagnostic
 * generation.
 */
export function checkRequiredAttributes(
  requirement: RoleAttributeRequirements,
  { props, effectiveRole }: AriaContext,
): readonly AriaResult[] {
  if (!effectiveRole) return NO_VIOLATIONS

  const requiredAttributes = requirement.attributesByRole[effectiveRole]
  if (!requiredAttributes) return NO_VIOLATIONS

  const results: AriaResult[] = []

  for (const attribute of requiredAttributes) {
    if (attribute in props) continue

    results.push({
      valid: false,
      fixable: false,
      severity: 'warning',
      attribute,
      diagnostic: requirement.diagnosticFor(attribute, effectiveRole),
    })
  }

  return results
}
