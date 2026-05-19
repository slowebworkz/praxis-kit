import type { IntrinsicProps } from './primitives'
import type { AriaPhase, Severity } from './aria-rule'

/**
 * A single recorded ARIA policy violation.
 *
 * `phase` indicates when the violation was detected (`'evaluate'` for all current rules).
 * `role` is `undefined` when the violation is not role-specific (e.g. empty `role=""`).
 * `attribute` is set when the violation targets a specific `aria-*` prop rather than `role`.
 */
export type ValidationViolation = {
  message: string
  tag: string
  role: string | undefined
  attribute: string | undefined
  severity: Severity
  phase: AriaPhase
}

/**
 * The result of a full `AriaPolicyEngine.evaluate()` call.
 *
 * `props` is the post-fix props object — role attributes may have been stripped.
 * `violations` reflects the pre-fix state; callers receive both signals independently.
 */
export type ValidationResult = {
  props: IntrinsicProps
  violations: ReadonlyArray<ValidationViolation>
}
