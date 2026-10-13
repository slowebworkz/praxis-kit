// `AriaRole` (`KnownAriaRole | (string & {})`) is defined once in `@praxis-kit/primitive`; this
// package re-exports it — plus the backing constant and guard — so `@praxis-kit/contract/types`
// stays a complete surface for consumers that never reach for `primitive` directly.
export { KNOWN_ARIA_ROLES } from '@praxis-kit/primitive'
export { isKnownAriaRole } from '@praxis-kit/guards'
export type { AriaRole, KnownAriaRole } from '@praxis-kit/primitive'
