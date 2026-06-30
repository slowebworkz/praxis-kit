import type { KnownAriaRole } from './known-aria-role'

export type AriaRole = KnownAriaRole | (string & {})
