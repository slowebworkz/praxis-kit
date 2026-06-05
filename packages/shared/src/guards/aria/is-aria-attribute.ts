import { GLOBAL_ARIA_ATTRIBUTES, ROLE_RESTRICTED_ATTRIBUTES } from '../../constants/aria'

export function isGlobalAriaAttribute(attr: string): boolean {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr)
}

export function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr)
  if (allowedRoles === undefined) return true
  if (role === undefined) return false
  return allowedRoles.has(role)
}
