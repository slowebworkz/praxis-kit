import type { KnownAriaRole } from '@praxis-kit/primitive'

export { KNOWN_ARIA_ROLES } from '@praxis-kit/primitive'
export { isKnownAriaRole } from '@praxis-kit/primitive'
export type { KnownAriaRole } from '@praxis-kit/primitive'

export type AriaRole = KnownAriaRole | (string & {})
