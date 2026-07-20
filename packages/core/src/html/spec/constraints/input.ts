import type { MutuallyExclusivePolicy } from '../types'
import { InputAccessibilityDiagnostics } from '@praxis-kit/contract'

// Exported individually (rather than only as array entries) so call sites can reference a
// specific policy directly instead of looking one up by props at runtime — the only way that
// lookup could fail is a typo, which this makes a compile error (wrong import name) instead.
export const REQUIRED_READONLY_CONFLICT: MutuallyExclusivePolicy = {
  props: ['required', 'readOnly'],
  diagnostic: () => InputAccessibilityDiagnostics.requiredReadOnlyConflict(),
}

export const INPUT_MUTUALLY_EXCLUSIVE_POLICIES: readonly MutuallyExclusivePolicy[] = [
  REQUIRED_READONLY_CONFLICT,
]
