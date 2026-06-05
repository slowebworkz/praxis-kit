import { KNOWN_ARIA_ROLES_SET } from '../../constants/aria'
import type { KnownAriaRole } from '../../types'

export type { KnownAriaRole }

export function isKnownAriaRole(value: unknown): value is KnownAriaRole {
  return typeof value === 'string' && KNOWN_ARIA_ROLES_SET.has(value)
}
