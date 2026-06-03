import type { Severity } from './severity'

export type ValidationViolation = {
  message: string
  tag: string
  role: string | undefined
  attribute: string | undefined
  severity: Severity
  phase: 'evaluate' | 'fix'
}
