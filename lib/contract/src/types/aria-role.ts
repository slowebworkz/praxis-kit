import type { KnownAriaRole } from '@praxis-ui/shared/guards/aria'

export { KNOWN_ARIA_ROLES } from '@praxis-ui/shared/constants/aria'
export { isKnownAriaRole } from '@praxis-ui/shared/guards/aria'
export type { KnownAriaRole } from '@praxis-ui/shared/guards/aria'

export type AriaRole = KnownAriaRole | (string & {})
