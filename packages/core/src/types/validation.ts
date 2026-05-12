import type { IntrinsicProps } from './primitives'
import type { AriaPhase } from './aria-rule'

export type ValidationViolation = {
  message: string
  tag: string
  role: string | undefined
  severity: 'error' | 'warning'
  phase: AriaPhase
}

export type ValidationResult = {
  props: IntrinsicProps
  violations: ReadonlyArray<ValidationViolation>
}
