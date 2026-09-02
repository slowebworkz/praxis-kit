// `AriaRole` (`KnownAriaRole | (string & {})`) is defined once in `@praxis-kit/primitive`; this
// package re-exports it — plus the backing constant and guard — so `@praxis-kit/contract/types`
// stays a complete surface for consumers that never reach for `primitive` directly.
export { KNOWN_ARIA_ROLES, isKnownAriaRole } from '@praxis-kit/primitive'
export type { AriaRole, KnownAriaRole } from '@praxis-kit/primitive'
