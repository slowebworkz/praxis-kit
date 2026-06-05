import type { KnownAriaRole } from '../../guards/aria/is-known-aria-role'

export type AriaRole = KnownAriaRole | (string & {})
