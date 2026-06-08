import type { IntrinsicTag, ValidationResult } from '@praxis-kit/shared/types'
import type { AriaContext } from './aria-rule'

export type { ValidationResult, ValidationViolation } from '@praxis-kit/shared/types'

export type NormalizationResult =
  | { normalized: false }
  | { normalized: true; result: ValidationResult }

export type EvaluationContext =
  | { proceed: false; result: ValidationResult }
  | {
      proceed: true
      tag: IntrinsicTag
      implicitRole: string | undefined
      effectiveRole: string | undefined
      context: AriaContext
    }
