import type { AnyRecord } from '../any-record'
import type { ValidationViolation } from './validation-violation'

export type ValidationResult = {
  props: AnyRecord
  violations: ReadonlyArray<ValidationViolation>
}
