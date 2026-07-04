import type { ValidationViolation } from './validation-violation'

export type ValidationResult = {
  props: Record<string, unknown>
  violations: ReadonlyArray<ValidationViolation>
}
