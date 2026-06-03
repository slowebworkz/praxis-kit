import type { IntrinsicTag } from './primitives'
import type { AriaContext } from './aria-rule'
import type { ValidationResult } from '@praxis-ui/shared/types'

export type { ValidationResult, ValidationViolation } from '@praxis-ui/shared/types'

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
