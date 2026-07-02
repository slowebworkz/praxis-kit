import type { KnownAriaRole } from '@praxis-kit/primitive/guards/aria'

export { KNOWN_ARIA_ROLES } from '@praxis-kit/primitive/constants/aria'
export { isKnownAriaRole } from '@praxis-kit/primitive/guards/aria'
export type { KnownAriaRole } from '@praxis-kit/primitive/guards/aria'

export type AriaRole = KnownAriaRole | (string & {})
