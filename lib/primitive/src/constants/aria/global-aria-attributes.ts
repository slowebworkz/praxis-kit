import type { AriaAttributes } from './types'

// WAI-ARIA 1.2 §6.5 — global states and properties (inherited by every role).
// `aria-dropeffect` and `aria-grabbed` are omitted (deprecated since ARIA 1.1).
// `aria-label` / `aria-labelledby` are global BUT prohibited on the Name-Prohibited roles —
// that exception is enforced by `#checkNameProhibitedRoles`, not by removing them here.
export const GLOBAL_ARIA_ATTRIBUTES: AriaAttributes = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-controls',
  'aria-current',
  'aria-describedby',
  'aria-description',
  'aria-details',
  'aria-disabled',
  'aria-errormessage',
  'aria-flowto',
  'aria-hidden',
  'aria-keyshortcuts',
  'aria-label',
  'aria-labelledby',
  'aria-live',
  'aria-owns',
  'aria-relevant',
  'aria-roledescription',
])
