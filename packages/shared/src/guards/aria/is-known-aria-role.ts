import { KNOWN_ARIA_ROLES } from '../../constants/aria'

export type KnownAriaRole = (typeof KNOWN_ARIA_ROLES)[number]

const KNOWN_ARIA_ROLES_SET: ReadonlySet<string> = new Set(KNOWN_ARIA_ROLES)

export function isKnownAriaRole(value: unknown): value is KnownAriaRole {
  return typeof value === 'string' && KNOWN_ARIA_ROLES_SET.has(value)
}
