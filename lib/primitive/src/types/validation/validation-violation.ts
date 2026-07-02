import type { DiagnosticInput } from '@praxis-kit/diagnostics'
import type { Severity } from './severity'

export type ValidationViolation = {
  message: string
  tag: string
  role: string | undefined
  attribute: string | undefined
  severity: Severity
  phase: 'evaluate' | 'fix'
  diagnostic?: DiagnosticInput
}
