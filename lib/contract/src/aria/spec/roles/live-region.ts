import type { AriaRole } from '../../../types'
import { requiredAttributeByRole } from '../validators/required-properties-validator'

type AriaLivePoliteness = 'assertive' | 'off' | 'polite'

// WAI-ARIA live region roles and their implied aria-live politeness values.
export const LIVE_REGION_ROLES: ReadonlyMap<AriaRole, AriaLivePoliteness> = new Map([
  ['alert', 'assertive'],
  ['status', 'polite'],
  ['log', 'polite'],
  ['timer', 'off'],
])

// Every live-region role implicitly requires `aria-atomic`.
//
// Derive this table from `LIVE_REGION_ROLES` so the two cannot drift apart.
export const ATOMIC_REQUIREMENTS = requiredAttributeByRole(LIVE_REGION_ROLES.keys(), 'aria-atomic')
