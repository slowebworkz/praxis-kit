export type { IntrinsicProps, PropsWithRole } from './contract-primitives'
export { hasRole } from './intrinsic-props'
export type { AriaRole, KnownAriaRole } from './aria-role'
export { KNOWN_ARIA_ROLES, isKnownAriaRole } from './aria-role'
export type {
  AriaContext,
  AriaFix,
  AriaFixResult,
  AriaPhase,
  AriaResult,
  AriaRule,
  FixKind,
  InvalidResult,
  InvalidWithFix,
  InvalidWithoutFix,
  RemoveAttributeFixKind,
  Severity,
  ValidResult,
} from './aria-rule'
export type {
  EvaluationContext,
  NormalizationResult,
  ValidationResult,
  ValidationViolation,
} from './validation'
export type {
  Cardinality,
  CardinalityInput,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  MatchMatrix,
  NormalizedChildRule,
} from './child-rule'
export type { AriaPlan } from './aria-plan'
