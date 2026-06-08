import type { KnownAriaRole } from '@praxis-kit/shared/guards/aria'

export { KNOWN_ARIA_ROLES } from '@praxis-kit/shared/constants/aria'
export { isKnownAriaRole } from '@praxis-kit/shared/guards/aria'
export type { KnownAriaRole } from '@praxis-kit/shared/guards/aria'

export type AriaRole = KnownAriaRole | (string & {})
