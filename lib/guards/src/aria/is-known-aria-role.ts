import { KNOWN_ARIA_ROLES_SET } from '@praxis-kit/primitive'
import type { KnownAriaRole } from '@praxis-kit/primitive'
import { isString } from '../foundational'

export type { KnownAriaRole }

export function isKnownAriaRole(value: unknown): value is KnownAriaRole {
  return isString(value) && KNOWN_ARIA_ROLES_SET.has(value)
}
