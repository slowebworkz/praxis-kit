import { GLOBAL_ARIA_ATTRIBUTES, ROLE_RESTRICTED_ATTRIBUTES } from '@praxis-kit/primitive'
import { isDefined } from 'guardz'

export function isGlobalAriaAttribute(attr: string): boolean {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr)
}

export function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr)
  if (!isDefined(allowedRoles)) return true
  if (!isDefined(role)) return false
  return allowedRoles.has(role)
}
