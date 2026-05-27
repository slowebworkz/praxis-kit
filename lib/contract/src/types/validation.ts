import type { IntrinsicTag } from '@praxis-ui/primitive'
import type { IntrinsicProps } from './contract-primitives'
import type { AriaContext, AriaPhase, Severity } from './aria-rule'

export type ValidationViolation = {
  message: string
  tag: string
  role: string | undefined
  attribute: string | undefined
  severity: Severity
  phase: AriaPhase
}

export type ValidationResult = {
  props: IntrinsicProps
  violations: ReadonlyArray<ValidationViolation>
}

export type NormalizationResult =
  | { normalized: false }
  | { normalized: true; result: ValidationResult }

export type EvaluationContext =
  | { proceed: false; result: ValidationResult }
  | {
      proceed: true
      tag: IntrinsicTag
      implicitRole: string
      effectiveRole: string
      context: AriaContext
    }
