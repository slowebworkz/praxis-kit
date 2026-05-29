// Contract runtime layer — ARIA enforcement, children validation, strict mode.
// Includes everything from the primitive entry.
export * from './primitive'
export * from './html'
export { StrictBase } from '@praxis-ui/contract'
export {
  AriaPolicyEngine,
  ChildrenEvaluator,
  isInvalid,
  isAriaAttributeValidForRole,
  isGlobalAriaAttribute,
  getImplicitRole,
  isStandaloneTag,
  isStrongImplicitRole,
  KNOWN_ARIA_ROLES,
  isKnownAriaRole,
  hasRole,
} from '@praxis-ui/contract'
export { createContractedPolymorphic } from './factory/create-polymorphic-contracted'
export { createResolverPipeline } from './resolver'
export type {
  StrictMode,
  AriaContext,
  AriaFix,
  AriaFixResult,
  AriaPhase,
  AriaResult,
  AriaRule,
  FixKind,
  RemoveAttributeFixKind,
  InvalidResult,
  InvalidWithFix,
  InvalidWithoutFix,
  Severity,
  ValidResult,
  BiDirectionalMap,
  Cardinality,
  CardinalityInput,
  ChildIndex,
  ChildRuleInput,
  ChildRuleMatch,
  ChildRulePosition,
  MatchMatrix,
  NormalizedChildRule,
  RuleIndex,
  ResolveInput,
  ResolveOutput,
  ResolverOptions,
  EvaluationContext,
  NormalizationResult,
  ValidationResult,
  ValidationViolation,
} from './types'
