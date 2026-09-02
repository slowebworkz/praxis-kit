import type { IntrinsicTag, ValidationResult, ValidationViolation } from '@praxis-kit/primitive'
import type { AriaContext } from './aria'
import type { IntrinsicProps } from './contract-primitives'

export type { ValidationResult, ValidationViolation } from '@praxis-kit/primitive'

/**
 * Result of the normalization phase.
 *
 * A successful normalization returns a fully formed `ValidationResult`
 * immediately, allowing evaluation to short-circuit before rule execution.
 */
export type NormalizationResult =
  { normalized: false } | { normalized: true; result: ValidationResult }

/**
 * Normalized element state after a successful evaluation, ready for the
 * validation pipeline: resolved ARIA semantics, and any violations produced
 * before rule evaluation. Built-in role-based rules use `hasRole` to
 * determine whether they should execute, while consumer-supplied rules
 * always run regardless of role semantics.
 */
export interface SuccessfulEvaluationContext {
  tag: IntrinsicTag
  implicitRole: string | undefined
  effectiveRole: string | undefined
  hasRole: boolean
  props: IntrinsicProps
  preExistingViolations: readonly ValidationViolation[]
  context: AriaContext
}

/**
 * Shared state passed to the validation pipeline after normalization.
 *
 * If `proceed` is `false`, evaluation has already completed and `result`
 * contains the final validation output. Otherwise, the context is a
 * {@link SuccessfulEvaluationContext}.
 */
export type EvaluationContext =
  { proceed: false; result: ValidationResult } | ({ proceed: true } & SuccessfulEvaluationContext)
