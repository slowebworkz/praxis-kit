import { GLOBAL_ARIA_ATTRIBUTES, ROLE_RESTRICTED_ATTRIBUTES } from '../../constants/aria'
import { isUndefined } from '../foundational/is-defined'

export function isGlobalAriaAttribute(attr: string): boolean {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr)
}

export function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr)
  if (isUndefined(allowedRoles)) return true
  if (isUndefined(role)) return false
  return allowedRoles.has(role)
}
