import type { AriaAttributes } from './types'

// WAI-ARIA 1.2 §6.6.6 — states and properties inherited by all roles.
// aria-dropeffect and aria-grabbed are omitted (deprecated since ARIA 1.1).
export const GLOBAL_ARIA_ATTRIBUTES: AriaAttributes = new Set([
  'aria-atomic',
  'aria-busy',
  'aria-controls',
  'aria-current',
  'aria-describedby',
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
