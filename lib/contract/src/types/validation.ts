import type { IntrinsicTag, ValidationResult, ValidationViolation } from '@praxis-kit/primitive'
import type { AriaContext } from './aria'
import type { IntrinsicProps } from './contract-primitives'

export type { ValidationResult, ValidationViolation } from '@praxis-kit/primitive'

export type NormalizationResult =
  { normalized: false } | { normalized: true; result: ValidationResult }

export type EvaluationContext =
  | { proceed: false; result: ValidationResult }
  | {
      proceed: true
      tag: IntrinsicTag
      implicitRole: string | undefined
      effectiveRole: string | undefined
      // Props to validate/fix against — the original props, unless empty-role normalization
      // already stripped `role`, in which case this is the post-strip props.
      props: IntrinsicProps
      // Violations already produced before rule evaluation (e.g. the empty-role warning) that
      // must be merged into the final result alongside whatever the rule pipeline finds.
      preExistingViolations: readonly ValidationViolation[]
      context: AriaContext
    }
